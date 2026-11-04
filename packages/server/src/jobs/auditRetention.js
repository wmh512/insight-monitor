import { cleanupAuditLogs } from '../services/auditService.js'

export function startAuditRetention(days) {
  async function cleanup() {
    try {
      await cleanupAuditLogs(days)
    } catch (error) {
      console.error('[audit] 过期记录清理失败:', error.message)
    }
  }
  void cleanup()
  const timer = setInterval(cleanup, 24 * 60 * 60 * 1000)
  timer.unref()
  return timer
}
