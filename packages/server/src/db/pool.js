import mysql from 'mysql2/promise'
import config from '../config.js'

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  charset: 'utf8mb4', // 今天 ERROR 1366 的解药：连接时声明说 UTF-8
  waitForConnections: true,
  connectionLimit: 10,
})
