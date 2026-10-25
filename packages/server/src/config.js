import dotenv from 'dotenv'

// 把 .env 文件里的键值对，加载到 process.env 上
dotenv.config()

const config = {
  port: Number(process.env.PORT ?? 3000),
  reportToken: process.env.REPORT_TOKEN ?? '',
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
