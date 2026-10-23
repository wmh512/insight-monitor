import { pool } from '../db/pool.js'
import { getRawBody } from '../utils/rawBody.js'

/**
 * POST /api/report 上报接口
 * SDK 的队列批量发来一个 ReportData 数组，按 type 分流落库
 */
export async function handleReport(ctx) {
  // ---- 1. 读原始请求体（text/plain，Koa 不自动解析）----
  const raw = await getRawBody(ctx)

  // ---- 2. 解析 JSON：失败说明发来的不是合法数据，400 ----
  let list
  try {
    list = JSON.parse(raw)
  } catch {
    ctx.status = 400
    ctx.body = { code: 400, message: '请求体不是合法的 JSON' }
    return
  }

  // ---- 3. 校验必须是非空数组 ----
  if (!Array.isArray(list) || list.length === 0) {
    ctx.status = 400
    ctx.body = { code: 400, message: '请求体必须是非空数组' }
    return
  }

  // ---- 4. 查项目 id：SDK 发的是字符串钥匙，库里存的是自增数字 ----
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

  // ---- 5. 按 type 分组收集参数（每组一次批量插入）----
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

  // ---- 6. 响应 ----
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
