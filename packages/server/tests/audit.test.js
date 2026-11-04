import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import queryRouter from '../src/routes/query.js'
import { pool } from '../src/db/pool.js'
import config from '../src/config.js'
import { resetSessions } from '../src/middlewares/session.js'

function mockDatabase(t) {
  const queries = []
  const originals = { query: pool.query, execute: pool.execute }
  pool.query = async (sql, params) => { queries.push({ sql, params }); return [[{ id: 1, total: 1 }]] }
  pool.execute = async (sql, params) => { queries.push({ sql, params }); return [[{ id: 1 }]] }
  t.after(() => { pool.query = originals.query; pool.execute = originals.execute })
  return queries
}

test('访问记录：成功、失败、退出均记录，且不保存密码和会话令牌', async (t) => {
  resetSessions()
  const queries = mockDatabase(t)
  const original = { ...config.admin }
  Object.assign(config.admin, { username: 'admin', password: 'test-only-password' })
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => { Object.assign(config.admin, original); resetSessions(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  await fetch(`${base}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'wrong-password' }) })
  const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'User-Agent': 'Audit Test Browser' }, body: JSON.stringify({ username: 'admin', password: 'test-only-password' }) })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } })
  const inserts = queries.filter((item) => item.sql.includes('INSERT INTO audit_logs'))
  assert.deepEqual(inserts.map((item) => [item.params[1], item.params[3]]), [['login', 'failure'], ['login', 'success'], ['logout', 'success']])
  assert.equal(inserts[1].params[6], 'Audit Test Browser')
  const serialized = JSON.stringify(inserts)
  assert.equal(serialized.includes('test-only-password'), false)
  assert.equal(serialized.includes('wrong-password'), false)
  assert.equal(serialized.includes(cookie), false)
})

test('审计查询：仅管理员可访问，viewer 与匿名用户均被拒绝', async (t) => {
  resetSessions()
  const originals = { admin: { ...config.admin }, viewer: { ...config.viewer } }
  Object.assign(config.admin, { username: 'admin', password: 'test-only-password' })
  Object.assign(config.viewer, { username: 'viewer', password: 'viewer-password', projectKey: 'demo', expiresAt: Date.now() + 60000 })
  const queries = mockDatabase(t)
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => { Object.assign(config.admin, originals.admin); Object.assign(config.viewer, originals.viewer); resetSessions(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  async function signIn(username, password) {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) })
    return response.headers.get('set-cookie').split(';')[0]
  }
  const adminCookie = await signIn('admin', 'test-only-password')
  const viewerCookie = await signIn('viewer', 'viewer-password')
  for (const path of ['/api/audit/login', '/api/audit/operations']) {
    assert.equal((await fetch(`${base}${path}`)).status, 401)
    assert.equal((await fetch(`${base}${path}`, { headers: { Cookie: viewerCookie } })).status, 403)
    assert.equal((await fetch(`${base}${path}?username=admin&eventType=login&result=success&ip=127.0.0.1`, { headers: { Cookie: adminCookie } })).status, 200)
  }
  const listQueries = queries.filter((item) => item.sql.includes('FROM audit_logs WHERE'))
  assert.equal(listQueries.length, 4)
  assert.equal(listQueries.every((item) => item.params.includes('demo') === false), true)
})

test('错误状态修改：成功与对象不存在均写入操作审计', async (t) => {
  resetSessions()
  const originalAdmin = { ...config.admin }
  Object.assign(config.admin, { username: 'admin', password: 'test-only-password' })
  const queries = mockDatabase(t)
  const originalGetConnection = pool.getConnection
  let exists = true
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    execute: async (sql, params) => {
      queries.push({ sql, params })
      return [sql.startsWith('SELECT status FROM issue') ? (exists ? [{ status: 'unseen' }] : []) : []]
    },
  })
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => { Object.assign(config.admin, originalAdmin); pool.getConnection = originalGetConnection; resetSessions(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'test-only-password' }) })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await fetch(`${base}/api/issues/fp-1`, { method: 'PATCH', headers: { Cookie: cookie }, body: '{"status":"resolved"}' })).status, 200)
  exists = false
  assert.equal((await fetch(`${base}/api/issues/missing`, { method: 'PATCH', headers: { Cookie: cookie }, body: '{"status":"resolved"}' })).status, 404)
  const inserts = queries.filter((item) => item.sql.includes('INSERT INTO audit_logs') && item.params[0] === 'operation')
  assert.equal(inserts.length, 2)
  assert.equal(inserts[0].params[3], 'success')
  assert.deepEqual(JSON.parse(inserts[0].params[9]), { status: { from: 'unseen', to: 'resolved' } })
  assert.deepEqual([inserts[1].params[3], inserts[1].params[4]], ['failure', 'not_found'])
})
