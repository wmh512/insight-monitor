import { queryAuditLogs } from '../services/auditService.js'

function listAudit(category) {
  return async (ctx) => {
    try {
      ctx.body = { code: 0, data: await queryAuditLogs(category, ctx.query) }
    } catch (error) {
      if (error.status !== 400) throw error
      ctx.status = 400
      ctx.body = { code: 400, message: error.message }
    }
  }
}

export const listLoginAudit = listAudit('auth')
export const listOperationAudit = listAudit('operation')
