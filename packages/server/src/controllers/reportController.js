import { pool } from '../db/pool.js'
import { decideNotification, notifyIssue } from '../utils/notifier.js'

/**
 * POST /api/report 上报接口
 * SDK 的队列批量发来 { token, data: [ReportData, ...] }，按 type 分流落库
 *
 * W9-a 起：请求体的读取、解析、token 校验都在 reportAuth 中间件做
 * （请求体是流只能读一次），通过后数据挂在 ctx.state.reportData
 */
export async function handleReport(ctx) {
  const list = ctx.state.reportData

  // ---- 1. 校验 data 必须是非空数组 ----
  if (!Array.isArray(list) || list.length === 0) {
    ctx.status = 400
    ctx.body = { code: 400, message: 'data 必须是非空数组' }
    return
  }

  // ---- 2. 查项目 id：SDK 发的是字符串钥匙，库里存的是自增数字 ----
  const projectKey = list[0].projectId
  const [projectRows] = await pool.execute('SELECT id FROM project WHERE project_key = ?', [
    projectKey,
  ])
  if (projectRows.length === 0) {
    ctx.status = 400
    ctx.body = { code: 400, message: `未知项目: ${projectKey}` }
    return
  }
  const projectId = projectRows[0].id

  // ---- 3. 按 type 分组收集参数（每组一次批量插入）----
  const errorRows = []
  const perfRows = []
  for (const item of list) {
    if (item.type === 'error') {
      errorRows.push(buildErrorRow(projectId, item))
    } else if (item.type === 'performance') {
      perfRows.push(buildPerfRow(projectId, item))
    }
  }
  // ---- 4. 错误入库（批量插入，W4-02 优化：20 条数据 2 次查询）----
  if (errorRows.length > 0) {
    const { sql, params } = buildBatchInsert(
      'error_report',
      ['project_id', 'fingerprint', 'kind', 'message', 'stack', 'page_url', 'ua'],
      errorRows,
    )
    await pool.execute(sql, params)
  }

  // ---- 5. 性能数据入库（批量）----
  if (perfRows.length > 0) {
    const { sql, params } = buildBatchInsert(
      'perf_report',
      ['project_id', 'fp', 'fcp', 'lcp', 'page_url', 'ua'],
      perfRows,
    )
    await pool.execute(sql, params)
  }

  // ---- 6. issue 生命周期（W9-d）：指纹即 issue 身份，状态机 + 递增通知 ----
  //    指纹 = issue 的主键：同一指纹 = 同一个 issue
  if (errorRows.length > 0) {
    // 本批内每个指纹出现了几次 + 该指纹的第一条数据
    const batchCounts = new Map()
    const rowByFp = new Map()
    for (const row of errorRows) {
      batchCounts.set(row[1], (batchCounts.get(row[1]) ?? 0) + 1)
      if (!rowByFp.has(row[1])) rowByFp.set(row[1], row)
    }
    const fingerprints = [...batchCounts.keys()]

    // ① 先查旧状态——必须在写入之前，写完就看不出谁是新来的了
    const [oldRows] = await pool.execute(
      `SELECT fingerprint, status, seen_count, notify_count, last_notified_at
       FROM issue WHERE fingerprint IN (${fingerprints.map(() => '?').join(', ')})`,
      fingerprints,
    )
    const oldMap = new Map(oldRows.map((r) => [r.fingerprint, r]))

    // ② 新 issue 直接插入（INSERT IGNORE：已存在的不动，交给第③步）
    //    列清单与值表达式写在一起——手写占位符最容易数错（本次就错了一个 ?）
    const ISSUE_COLS = [
      'fingerprint',
      'project_id',
      'kind',
      'message',
      'last_page_url',
      'seen_count',
      'first_seen',
      'last_seen',
    ]
    const ISSUE_VALUES = ['?', '?', '?', '?', '?', '?', 'NOW()', 'NOW()']
    const placeholders = fingerprints.map(() => `(${ISSUE_VALUES.join(', ')})`).join(', ')
    const insertParams = []
    for (const fp of fingerprints) {
      const row = rowByFp.get(fp)
      insertParams.push(fp, projectId, row[2], row[3], row[5], batchCounts.get(fp))
    }
    await pool.execute(
      `INSERT IGNORE INTO issue (${ISSUE_COLS.join(', ')}) VALUES ${placeholders}`,
      insertParams,
    )

    // ③ 已存在的 issue：累加次数 + 复活（resolved → unseen）
    //    赋值顺序有讲究：resolved_at 必须排在 status 之前——否则 status 已被更新，
    //    就看不出这条到底是不是"复活"的了
    for (const fp of fingerprints) {
      if (!oldMap.has(fp)) continue
      const row = rowByFp.get(fp)
      await pool.execute(
        `UPDATE issue
         SET seen_count    = seen_count + ?,
             last_seen     = NOW(),
             last_page_url = ?,
             resolved_at   = IF(status = 'resolved', NULL, resolved_at),
             status        = IF(status = 'resolved', 'unseen', status)
         WHERE fingerprint = ?`,
        [batchCounts.get(fp), row[5], fp],
      )
    }

    // ④ 通知决策 + 推送（每个指纹只判一次，避免同批重复推）
    for (const fp of fingerprints) {
      const old = oldMap.get(fp) ?? null
      const row = rowByFp.get(fp)
      const current = {
        fingerprint: fp,
        kind: row[2],
        message: row[3],
        pageUrl: row[5],
        seenCount: (old?.seen_count ?? 0) + batchCounts.get(fp),
        notifyCount: (old?.notify_count ?? 0) + 1,
      }
      const decision = decideNotification(old)
      if (!decision) continue
      notifyIssue(decision, current)
      // 通知计数 +1 + 记下通知时间（冷却窗口靠它判断）
      await pool.execute(
        `UPDATE issue SET notify_count = notify_count + 1, last_notified_at = NOW() WHERE fingerprint = ?`,
        [fp],
      )
    }
  }

  // ---- 7. 响应 ----
  ctx.body = { code: 0, message: 'ok', received: list.length }
}

/** 收集一条错误数据的参数行（只组装，不执行） */
function buildErrorRow(projectId, item) {
  const error = item.error
  return [
    projectId,
    error.fingerprint,
    error.kind,
    error.message,
    error.stack,
    item.pageUrl,
    item.device?.ua ?? '',
  ]
}

/** 收集一条性能数据的参数行 */
function buildPerfRow(projectId, item) {
  const perf = item.perf
  return [projectId, perf.FP, perf.FCP, perf.LCP, item.pageUrl, item.device?.ua ?? '']
}

/**
 * 构造批量插入的 SQL 和参数
 * 表名/列名是代码里的常量（白名单），数据全部走 ? 占位——安全
 */
function buildBatchInsert(table, columns, rows) {
  const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`
  const placeholders = rows.map(() => rowPlaceholder).join(', ')
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`
  const params = rows.flat()
  return { sql, params }
}

/**
 * GET /api/errors?projectKey=xxx&page=1&pageSize=20
 * 错误列表：按指纹聚合（同一错误多次出现 = 一行，cnt 计数）
 */
export async function getErrorList(ctx) {
  const { projectKey } = ctx.query
  const page = Math.max(1, parseInt(ctx.query.page ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize ?? '20', 10) || 20))

  if (!projectKey) {
    ctx.status = 400
    ctx.body = { code: 400, message: '缺少必填参数: projectKey' }
    return
  }

  const offset = (page - 1) * pageSize

  // 聚合列表（SQL 已在 explore-queries.sql 人肉验证过）
  const [rows] = await pool.query(
    `SELECT e.fingerprint,
            COUNT(*)          AS cnt,
            MAX(e.id)         AS id,
            MAX(e.created_at) AS last_seen,
            e.kind,
            e.message
     FROM error_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?
     GROUP BY e.fingerprint, e.kind, e.message
     ORDER BY last_seen DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [projectKey],
  )

  // 总数 = 聚合后的行数（不同指纹个数，不是记录数）
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM (
       SELECT e.fingerprint
       FROM error_report e
       JOIN project p ON e.project_id = p.id
       WHERE p.project_key = ?
       GROUP BY e.fingerprint, e.kind, e.message
     ) t`,
    [projectKey],
  )

  ctx.body = { code: 0, data: { list: rows, total: countRows[0].total, page, pageSize } }
}

/**
 * GET /api/perf?projectKey=xxx&page=1&pageSize=50
 * 性能记录列表（最近 N 条，W7 图表数据源）
 */
export async function getPerfList(ctx) {
  const { projectKey } = ctx.query
  const page = Math.max(1, parseInt(ctx.query.page ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(ctx.query.pageSize ?? '50', 10) || 50))

  if (!projectKey) {
    ctx.status = 400
    ctx.body = { code: 400, message: '缺少必填参数: projectKey' }
    return
  }

  const offset = (page - 1) * pageSize

  // 列表（SQL 已在 explore-perf.sql 人肉验证过）
  const [rows] = await pool.query(
    `SELECT e.id, e.fp, e.fcp, e.lcp, e.page_url, e.created_at
     FROM perf_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?
     ORDER BY e.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [projectKey],
  )

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM perf_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?`,
    [projectKey],
  )

  ctx.body = { code: 0, data: { list: rows, total: countRows[0].total, page, pageSize } }
}

/**
 * GET /api/errors/:id —— 某条错误的完整详情
 */
export async function getErrorDetail(ctx) {
  const id = parseInt(ctx.params.id, 10)
  if (!Number.isInteger(id) || id <= 0) {
    ctx.status = 400
    ctx.body = { code: 400, message: 'id 必须是正整数' }
    return
  }

  const [rows] = await pool.execute(
    `SELECT id, kind, message, stack, page_url, ua, created_at
     FROM error_report WHERE id = ?`,
    [id],
  )
  if (rows.length === 0) {
    ctx.status = 404
    ctx.body = { code: 404, message: `错误不存在: id=${id}` }
    return
  }
  ctx.body = { code: 0, data: rows[0] }
}

/**
 * GET /api/stats?projectKey=xxx —— 概览统计
 */
export async function getStats(ctx) {
  const { projectKey } = ctx.query
  if (!projectKey) {
    ctx.status = 400
    ctx.body = { code: 400, message: '缺少必填参数: projectKey' }
    return
  }

  const [totalRows] = await pool.execute(
    `SELECT COUNT(*)                       AS total_errors,
            SUM(e.created_at >= CURDATE()) AS today_errors
     FROM error_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?`,
    [projectKey],
  )
  const [kindRows] = await pool.execute(
    `SELECT e.kind, COUNT(*) AS cnt
     FROM error_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?
     GROUP BY e.kind`,
    [projectKey],
  )

  const byKind = {}
  for (const row of kindRows) byKind[row.kind] = row.cnt

  // 性能均值（W7-01 新增，喂看板数字卡片）
  // CAST AS DOUBLE：AVG 返回 DECIMAL，mysql2 会把它当字符串返回——CAST 保证 API 里是数字
  const [perfRows] = await pool.execute(
    `SELECT CAST(AVG(e.fp)  AS DOUBLE) AS avg_fp,
            CAST(AVG(e.fcp) AS DOUBLE) AS avg_fcp,
            CAST(AVG(e.lcp) AS DOUBLE) AS avg_lcp,
            COUNT(*)                     AS cnt
     FROM perf_report e
     JOIN project p ON e.project_id = p.id
     WHERE p.project_key = ?`,
    [projectKey],
  )

  ctx.body = { code: 0, data: { ...totalRows[0], byKind, perf: perfRows[0] } }
}
