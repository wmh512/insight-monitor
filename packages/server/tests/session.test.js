import assert from 'node:assert/strict'
import { test } from 'node:test'
import Koa from 'koa'
import Router from '@koa/router'
import config from '../src/config.js'
import { currentSession, login, logout, adminAuth, resetSessions } from '../src/middlewares/session.js'

function createApp() {
  const app = new Koa()
  const router = new Router()
  router.post('/api/auth/login', login)
  router.post('/api/auth/logout', logout)
  router.get('/api/auth/session', currentSession)
  router.get('/api/errors', adminAuth, (ctx) => { ctx.body = { code: 0 } })
  app.use(router.routes())
  return app.listen(0)
}

test('登录流程：错误密码有明确 401，正确登录建立 HttpOnly 会话', async (t) => {
  resetSessions()
  const original = { ...config.admin }
  Object.assign(config.admin, { username: 'reviewer', password: 'test-only-password' })
  const server = createApp()
  const base = `http://127.0.0.1:${server.address().port}`
  t.after(() => { Object.assign(config.admin, original); resetSessions(); server.close() })

  const wrong = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'reviewer', password: 'wrong' }),
  })
  assert.equal(wrong.status, 401)
  assert.equal(wrong.headers.get('www-authenticate'), null)
  assert.equal((await wrong.json()).message, '用户名或密码错误')

  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'reviewer', password: 'test-only-password' }),
  })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie')
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  const session = cookie.split(';')[0]
  assert.equal((await fetch(`${base}/api/errors`, { headers: { Cookie: session } })).status, 200)

  const out = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: session } })
  assert.match(out.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await fetch(`${base}/api/errors`, { headers: { Cookie: session } })).status, 401)

  const first = await fetch(`${base}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username: 'reviewer', password: 'test-only-password' }) })
  const oldCookie = first.headers.get('set-cookie').split(';')[0]
  const identity = await fetch(`${base}/api/auth/session`, { headers: { Cookie: oldCookie } })
  assert.equal(identity.status, 200)
  const second = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Cookie: oldCookie }, body: JSON.stringify({ username: 'reviewer', password: 'test-only-password' }) })
  assert.equal(second.status, 200, '已登录用户切换账号不应被误报为会话失效')
  assert.equal((await fetch(`${base}/api/errors`, { headers: { Cookie: oldCookie } })).status, 401)
  const newCookie = second.headers.get('set-cookie').split(';')[0]
  assert.equal((await fetch(`${base}/api/errors`, { headers: { Cookie: newCookie } })).status, 200)
})

test('登录流程：跨站请求拒绝，失败次数受限', async (t) => {
  resetSessions()
  const original = { ...config.admin }
  Object.assign(config.admin, { username: 'reviewer', password: 'test-only-password' })
  const server = createApp()
  const base = `http://127.0.0.1:${server.address().port}`
  t.after(() => { Object.assign(config.admin, original); resetSessions(); server.close() })
  const crossSite = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { Origin: 'https://attacker.example' }, body: '{}',
  })
  assert.equal(crossSite.status, 403)
  const sameSite = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { Origin: base }, body: '{}',
  })
  assert.equal(sameSite.status, 401)
  for (let i = 0; i < 5; i += 1) {
    await fetch(`${base}/api/auth/login`, { method: 'POST', body: '{}' })
  }
  const limited = await fetch(`${base}/api/auth/login`, { method: 'POST', body: '{}' })
  assert.equal(limited.status, 429)
})
