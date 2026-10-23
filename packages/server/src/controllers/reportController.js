import { pool } from '../db/pool.js'
import { getRawBody } from '../utils/rawBody.js'

/**
 * POST /api/report 上报接口
 * SDK 的队列批量发来一个 ReportData 数组，按 type 分流落库
 */
export async function handleReport(ctx) {
  // ---- 1. 读原始请求体（text/plain，Koa 不自动解析，用你写的工具）----
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

  // ---- 3. 校验必须是数组 ----
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

  // ---- 5. 分流入库（v1 循环单条，批量插入是下一个优化任务）----
  for (const item of list) {
    if (item.type === 'error') {
      await insertError(projectId, item)
    } else if (item.type === 'performance') {
      await insertPerformance(projectId, item)
    }
  }

  // ---- 6. 响应 ----
  ctx.body = { code: 0, message: 'ok', received: list.length }
}

async function insertError(projectId, item) {
  const error = item.error
  await pool.execute(
    `INSERT INTO error_report
       (project_id, fingerprint, kind, message, stack, page_url, ua)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      error.fingerprint,
      error.kind,
      error.message,
      error.stack,
      item.pageUrl,
      item.device?.ua ?? '',
    ],
  )
}

async function insertPerformance(projectId, item) {
  const perf = item.perf
  await pool.execute(
    `INSERT INTO perf_report
       (project_id, fp, fcp, lcp, page_url, ua)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [projectId, perf.FP, perf.FCP, perf.LCP, item.pageUrl, item.device?.ua ?? ''],
  )
}
