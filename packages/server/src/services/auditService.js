import { pool } from '../db/pool.js'

const failureReasons = new Set(['invalid_credentials', 'invalid_request', 'not_found', 'permission_denied'])
const limitText = (value, max) => String(value ?? '').slice(0, max)

/** Only explicitly supplied, non-secret fields may enter an audit record. */
export async function recordAudit(executor = pool, {
  category,
  eventType,
  ctx,
  username = '',
  result = 'success',
  failureReason = '',
  targetType = null,
  targetId = null,
  changes = null,
}) {
  if (!['auth', 'operation'].includes(category)) throw new Error('Invalid audit category')
  const detail = changes ? JSON.stringify(changes) : null
  await executor.execute(
    `INSERT INTO audit_logs
      (category, event_type, actor_username, result, failure_reason, ip, user_agent,
       target_type, target_id, change_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category, limitText(eventType, 64), limitText(username, 128), result,
      failureReasons.has(failureReason) ? failureReason : '', limitText(ctx.ip, 64),
      limitText(ctx.get('User-Agent'), 512), targetType, targetId ? limitText(targetId, 128) : null, detail,
    ],
  )
}

export async function queryAuditLogs(category, query) {
  const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20))
  const clauses = ['category = ?']
  const params = [category]
  const filters = { event_type: query.eventType, result: query.result, actor_username: query.username, ip: query.ip }
  for (const [field, value] of Object.entries(filters)) {
    if (value) {
      clauses.push(`${field} = ?`)
      params.push(String(value).slice(0, 128))
    }
  }
  for (const [field, operator] of [['startTime', '>='], ['endTime', '<=']]) {
    const value = query[field]
    if (value) {
      if (Number.isNaN(Date.parse(value))) {
        const error = new Error('时间格式无效')
        error.status = 400
        throw error
      }
      clauses.push(`created_at ${operator} ?`)
      params.push(new Date(value))
    }
  }
  const where = clauses.join(' AND ')
  const [[rows], [countRows]] = await Promise.all([
    pool.query(
      `SELECT id, category, event_type, actor_username, result, failure_reason, ip, user_agent,
              target_type, target_id, change_summary, created_at
       FROM audit_logs WHERE ${where} ORDER BY created_at DESC, id DESC
       LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params,
    ),
    pool.query(`SELECT COUNT(*) AS total FROM audit_logs WHERE ${where}`, params),
  ])
  return { list: rows, total: countRows[0].total, page, pageSize }
}

export async function cleanupAuditLogs(retentionDays = 30) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error('Invalid audit retention')
  await pool.execute('DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL ? DAY', [retentionDays])
}
