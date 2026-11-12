import { pool } from '../db/pool.js'

export async function listProjects(ctx) {
  const [rows] = await pool.execute(
    'SELECT project_key AS projectKey, name FROM project ORDER BY id',
  )
  ctx.body = { code: 0, data: rows }
}
