import dotenv from 'dotenv'

// 把 .env 文件里的键值对，加载到 process.env 上
dotenv.config()

const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'insight_monitor',
  },
}

export default config
