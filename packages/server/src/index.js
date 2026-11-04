import app from './app.js'
import config from './config.js'
import { startAuditRetention } from './jobs/auditRetention.js'

startAuditRetention(config.auditRetentionDays)
app.listen(config.port, () => {
  console.log(`[server] 监控服务端已启动: http://localhost:${config.port}`)
  console.log('[server] 上报接口: POST /api/report')
})
