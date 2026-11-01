import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import queryRouter from '../src/routes/query.js'
import { pool } from '../src/db/pool.js'
import { resetSessions } from '../src/middlewares/session.js'

test('管理接口：未登录不触发原生登录框', async (t) => {
  resetSessions()
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => server.close())
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/errors?projectKey=test`)
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('www-authenticate'), null)
})

test('真实管理路由：未登录均返回 401，绝不查询数据库', async (t) => {
  resetSessions()
  let databaseCalls = 0
  const originalQuery = pool.query
  const originalExecute = pool.execute
  pool.query = async () => { databaseCalls += 1; throw new Error('不应到达数据库') }
  pool.execute = async () => { databaseCalls += 1; throw new Error('不应到达数据库') }
  t.after(() => { pool.query = originalQuery; pool.execute = originalExecute })
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => server.close())
  const base = `http://127.0.0.1:${server.address().port}`
  const requests = [
    ['GET', '/api/errors?projectKey=test'],
    ['GET', '/api/errors/1'],
    ['GET', '/api/stats?projectKey=test'],
    ['GET', '/api/perf?projectKey=test'],
    ['PATCH', '/api/issues/test-fingerprint'],
  ]
  for (const [method, path] of requests) {
    const response = await fetch(`${base}${path}`, { method })
    assert.equal(response.status, 401, `${method} ${path} 必须拒绝未登录请求`)
  }
  assert.equal(databaseCalls, 0)
})
