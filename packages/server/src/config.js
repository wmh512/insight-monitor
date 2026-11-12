import dotenv from 'dotenv'

// 把 .env 文件里的键值对，加载到 process.env 上
dotenv.config()

const config = {
  port: Number(process.env.PORT ?? 3000),
  reportToken: process.env.REPORT_TOKEN ?? '',
  reportTokens: process.env.REPORT_TOKENS_JSON ?? '',
  admin: {
    username: process.env.ADMIN_USERNAME ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  },
  maxBodyBytes: Number(process.env.MAX_BODY_BYTES ?? 65536),
  reportRateLimit: Number(process.env.REPORT_RATE_LIMIT ?? 120),
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS ?? 30),
  trustProxyHttps: process.env.TRUST_PROXY_HTTPS === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Server酱 SendKey（W9-c 告警）：为空时告警静默关闭（fail-soft）
  sctSendKey: process.env.SCT_SENDKEY ?? '',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'insight_monitor',
  },
}

export default config
