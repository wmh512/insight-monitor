import { pool } from '../db/pool.js'

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

  ctx.body = { code: 0, data: { ...totalRows[0], byKind } }
}
