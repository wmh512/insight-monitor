import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import Router from '@koa/router'
import config from '../src/config.js'
import { adminAuth } from '../src/middlewares/auth.js'
import queryRouter from '../src/routes/query.js'
import { pool } from '../src/db/pool.js'

function createAdminApp() {
  const app = new Koa()
  const router = new Router()
  router.get('/api/protected', adminAuth, (ctx) => {
    ctx.body = { code: 0, data: 'private' }
  })
  app.use(router.routes())
  return app
}

function credential(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

test('管理接口：未配置账号时 fail closed，不开放查询', async (t) => {
  const original = { ...config.admin }
  config.admin.username = ''
  config.admin.password = ''
  t.after(() => Object.assign(config.admin, original))

  const server = createAdminApp().listen(0)
  t.after(() => server.close())
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/protected`)
  assert.equal(response.status, 401)
  assert.match(response.headers.get('www-authenticate'), /^Basic /)
})

test('管理接口：无凭证、错密码、正确凭证分别返回 401、401、200', async (t) => {
  const original = { ...config.admin }
  config.admin.username = 'reviewer'
  config.admin.password = 'test-only-password'
  t.after(() => Object.assign(config.admin, original))

  const server = createAdminApp().listen(0)
  t.after(() => server.close())
  const url = `http://127.0.0.1:${server.address().port}/api/protected`

  const missing = await fetch(url)
  assert.equal(missing.status, 401)
  assert.equal(await missing.json().then((body) => body.code), 401)

  const wrong = await fetch(url, {
    headers: { Authorization: credential('reviewer', 'wrong-password') },
  })
  assert.equal(wrong.status, 401)

  const correct = await fetch(url, {
    headers: { Authorization: credential('reviewer', 'test-only-password') },
  })
  assert.equal(correct.status, 200)
  assert.deepEqual(await correct.json(), { code: 0, data: 'private' })
})

test('管理接口：畸形 Authorization 不抛异常，也不会越过鉴权', async (t) => {
  const original = { ...config.admin }
  config.admin.username = 'reviewer'
  config.admin.password = 'test-only-password'
  t.after(() => Object.assign(config.admin, original))

  const server = createAdminApp().listen(0)
  t.after(() => server.close())
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/protected`, {
    headers: { Authorization: 'Basic not-valid-base64!!!' },
  })
  assert.equal(response.status, 401)
})

test('真实管理路由：五个接口未登录均返回 401，绝不查询数据库', async (t) => {
  const original = { ...config.admin }
  config.admin.username = 'reviewer'
  config.admin.password = 'test-only-password'
  t.after(() => Object.assign(config.admin, original))

  let databaseCalls = 0
  const originalQuery = pool.query
  const originalExecute = pool.execute
  pool.query = async () => { databaseCalls += 1; throw new Error('不应到达数据库') }
  pool.execute = async () => { databaseCalls += 1; throw new Error('不应到达数据库') }
  t.after(() => {
    pool.query = originalQuery
    pool.execute = originalExecute
  })

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
