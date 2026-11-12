import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import reportRouter from '../src/routes/report.js'
import { pool } from '../src/db/pool.js'
import config from '../src/config.js'

test('项目级 token 只接受对应项目，不兼容的项目仍拒绝错误凭证', async (t) => {
  const originalTokens = config.reportTokens
  const originalQuery = pool.query
  config.reportTokens = JSON.stringify({ portfolio: 'portfolio-test-token' })
  pool.query = async () => { throw new Error('无效请求不应查询数据库') }
  t.after(() => { config.reportTokens = originalTokens; pool.query = originalQuery })
  const app = new Koa()
  app.use(reportRouter.routes())
  const server = app.listen(0)
  t.after(() => server.close())
  const base = `http://127.0.0.1:${server.address().port}`
  for (const [projectId, token, expected] of [
    ['portfolio', 'wrong', 401],
    ['demo_project_key_001', 'portfolio-test-token', 401],
    ['portfolio', 'portfolio-test-token', 400],
  ]) {
    const response = await fetch(`${base}/api/report`, {
      method: 'POST', body: JSON.stringify({ token, data: [{ projectId }] }),
    })
    assert.equal(response.status, expected)
  }
})
