import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import queryRouter from '../src/routes/query.js'
import { resetSessions } from '../src/middlewares/session.js'
import { pool } from '../src/db/pool.js'
import config from '../src/config.js'

function setup(t) {
  resetSessions()
  const original = { admin: { ...config.admin }, viewer: { ...config.viewer } }
  Object.assign(config.admin, { username: 'admin', password: 'admin-test-password' })
  Object.assign(config.viewer, {
    username: 'viewer', password: 'viewer-test-password',
    projectKey: 'demo_project_key_001', expiresAt: Date.now() + 60000,
  })
  const queries = []
  const originalQuery = pool.query
  const originalExecute = pool.execute
  const originalGetConnection = pool.getConnection
  pool.query = async (sql, params) => { queries.push({ sql, params }); return [[{ total: 0 }]] }
  pool.execute = async (sql, params) => {
    queries.push({ sql, params })
    return sql.startsWith('UPDATE issue') ? [{ affectedRows: 0 }] : [[]]
  }
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    execute: async (sql, params) => { queries.push({ sql, params }); return [sql.startsWith('UPDATE issue') ? { affectedRows: 0 } : []] },
  })
  const app = new Koa()
  app.use(queryRouter.routes())
  const server = app.listen(0)
  t.after(() => {
    Object.assign(config.admin, original.admin)
    Object.assign(config.viewer, original.viewer)
    pool.query = originalQuery
    pool.execute = originalExecute
    pool.getConnection = originalGetConnection
    resetSessions()
    server.close()
  })
  return { base: `http://127.0.0.1:${server.address().port}`, queries }
}

async function signIn(base, username, password) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST', body: JSON.stringify({ username, password }),
  })
  return { response, cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '' }
}

test('viewer：可查看授权项目，跨项目查询、详情与修改均被拒绝', async (t) => {
  const { base, queries } = setup(t)
  const { response, cookie } = await signIn(base, 'viewer', 'viewer-test-password')
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).data, { username: 'viewer', role: 'viewer', projectKey: 'demo_project_key_001' })
  const read = await fetch(`${base}/api/errors?projectKey=demo_project_key_001`, { headers: { Cookie: cookie } })
  assert.equal(read.status, 200)
  for (const path of ['/api/errors?projectKey=private_project', '/api/stats?projectKey=private_project', '/api/perf?projectKey=private_project']) {
    const denied = await fetch(`${base}${path}`, { headers: { Cookie: cookie } })
    assert.equal(denied.status, 403)
  }
  const write = await fetch(`${base}/api/issues/fingerprint`, { method: 'PATCH', headers: { Cookie: cookie }, body: '{"status":"resolved"}' })
  assert.equal(write.status, 403)
  await fetch(`${base}/api/errors/42`, { headers: { Cookie: cookie } })
  const detail = queries.at(-1)
  assert.match(detail.sql, /AND p\.project_key = \?/)
  assert.deepEqual(detail.params, [42, 'demo_project_key_001'])
})

test('viewer：到期凭证不能登录；admin 保持原有管理能力', async (t) => {
  const { base } = setup(t)
  config.viewer.expiresAt = Date.now() - 1000
  const expired = await signIn(base, 'viewer', 'viewer-test-password')
  assert.equal(expired.response.status, 401)
  const admin = await signIn(base, 'admin', 'admin-test-password')
  assert.equal(admin.response.status, 200)
  const crossProject = await fetch(`${base}/api/errors?projectKey=private_project`, { headers: { Cookie: admin.cookie } })
  assert.equal(crossProject.status, 200)
  const write = await fetch(`${base}/api/issues/fingerprint`, { method: 'PATCH', headers: { Cookie: admin.cookie }, body: '{"status":"resolved"}' })
  assert.equal(write.status, 404)
})

test('viewer：登录后凭证到期，已有会话也会被拒绝', async (t) => {
  const { base } = setup(t)
  const { cookie } = await signIn(base, 'viewer', 'viewer-test-password')
  config.viewer.expiresAt = Date.now() - 1000
  const response = await fetch(`${base}/api/errors?projectKey=demo_project_key_001`, { headers: { Cookie: cookie } })
  assert.equal(response.status, 200)
  // 将系统时钟推进至到期之后，验证会话本身也遵循账号截止时间。
  const now = Date.now
  Date.now = () => now() + 120000
  t.after(() => { Date.now = now })
  const expired = await fetch(`${base}/api/errors?projectKey=demo_project_key_001`, { headers: { Cookie: cookie } })
  assert.equal(expired.status, 401)
})
