import { pool } from '../db/pool.js'

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
  if (errorRows.length > 0) {
    const { sql, params } = buildBatchInsert(
      'error_report',
      ['project_id', 'fingerprint', 'kind', 'message', 'stack', 'page_url', 'ua'],
      errorRows,
    )
    await pool.execute(sql, params)
  }
  if (perfRows.length > 0) {
    const { sql, params } = buildBatchInsert(
      'perf_report',
      ['project_id', 'fp', 'fcp', 'lcp', 'page_url', 'ua'],
      perfRows,
    )
    await pool.execute(sql, params)
  }

  // ---- 4. 响应 ----
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
