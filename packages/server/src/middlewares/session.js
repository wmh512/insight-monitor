import { randomBytes, timingSafeEqual } from 'node:crypto'
import config from '../config.js'
import { getRawBody } from '../utils/rawBody.js'

const COOKIE_NAME = 'insight_admin_session'
const SESSION_TTL_SECONDS = 8 * 60 * 60
const sessions = new Map()
const loginAttempts = new Map()

function safeEqual(actual, expected) {
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  const size = Math.max(left.length, right.length, 1)
  return timingSafeEqual(
    Buffer.concat([left, Buffer.alloc(size - left.length)]),
    Buffer.concat([right, Buffer.alloc(size - right.length)]),
  ) && left.length === right.length
}

function getToken(ctx) {
  const cookies = ctx.get('Cookie').split(';')
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=')
    if (cookie.slice(0, separator).trim() === COOKIE_NAME) {
      return cookie.slice(separator + 1).trim()
    }
  }
  return ''
}

function isSameOrigin(ctx) {
  const origin = ctx.get('Origin')
  if (!origin) return true
  try {
    const source = new URL(origin)
    const host = new URL(`${ctx.protocol}://${ctx.host}`)
    return source.protocol === host.protocol && source.hostname === host.hostname && source.port === host.port
  } catch {
    return false
  }
}

function cookie(ctx, value, maxAge) {
  const secure = ctx.secure ? '; Secure' : ''
  ctx.set('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`)
}

export function createSessionAuth({ now = () => Date.now() } = {}) {
  return async function adminAuth(ctx, next) {
    const token = getToken(ctx)
    const session = sessions.get(token)
    if (!session || session.expiresAt <= now()) {
      sessions.delete(token)
      ctx.status = 401
      // 不返回 WWW-Authenticate：让前端登录页处理，而不是浏览器原生弹窗。
      ctx.body = { code: 401, message: '登录已失效，请重新登录' }
      return
    }
    session.expiresAt = now() + SESSION_TTL_SECONDS * 1000
    ctx.state.adminUsername = session.username
    await next()
  }
}

export const adminAuth = createSessionAuth()

export async function login(ctx) {
  if (!isSameOrigin(ctx)) {
    ctx.status = 403
    ctx.body = { code: 403, message: '请求来源无效' }
    return
  }
  if (getToken(ctx) && sessions.has(getToken(ctx))) {
    ctx.status = 401
    ctx.body = { code: 401, message: '当前登录已失效，请重新登录' }
    return
  }
  const attempts = (loginAttempts.get(ctx.ip) ?? []).filter((time) => Date.now() - time < 60000)
  if (attempts.length >= 5) {
    ctx.status = 429
    ctx.body = { code: 429, message: '登录尝试过于频繁，请稍后再试' }
    return
  }
  let body
  try {
    body = JSON.parse(await getRawBody(ctx))
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') throw error
    ctx.status = 400
    ctx.body = { code: 400, message: '请求格式错误' }
    return
  }
  const username = typeof body?.username === 'string' ? body.username : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const valid = config.admin.username.length > 0 && config.admin.password.length > 0 &&
    username.length <= 128 && password.length <= 256 &&
    safeEqual(username, config.admin.username) && safeEqual(password, config.admin.password)
  if (!valid) {
    attempts.push(Date.now())
    loginAttempts.set(ctx.ip, attempts)
    ctx.status = 401
    ctx.body = { code: 401, message: '用户名或密码错误' }
    return
  }
  const previous = getToken(ctx)
  sessions.delete(previous)
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })
  cookie(ctx, token, SESSION_TTL_SECONDS)
  ctx.body = { code: 0, data: { username } }
}

export async function logout(ctx) {
  if (!isSameOrigin(ctx)) {
    ctx.status = 403
    ctx.body = { code: 403, message: '请求来源无效' }
    return
  }
  sessions.delete(getToken(ctx))
  cookie(ctx, '', 0)
  ctx.body = { code: 0, message: '已退出登录' }
}

export function resetSessions() {
  sessions.clear()
  loginAttempts.clear()
}
