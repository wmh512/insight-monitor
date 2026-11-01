import config from '../config.js'
import { getRawBody } from '../utils/rawBody.js'
import { timingSafeEqual } from 'node:crypto'

// 长度不同也保持一次比较，避免把密码长度和逐字符差异直接交给比较时序。
function safeEqual(actual, expected) {
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  const size = Math.max(left.length, right.length, 1)
  return timingSafeEqual(
    Buffer.concat([left, Buffer.alloc(size - left.length)]),
    Buffer.concat([right, Buffer.alloc(size - right.length)]),
  ) && left.length === right.length
}

/**
 * 管理端 HTTP Basic Auth：Authorization: Basic base64(username:password)。
 * 与 SDK 上报 token 分开配置；管理凭证不能出现在 SDK 或前端构建产物中。
 */
export async function adminAuth(ctx, next) {
  const authorization = ctx.get('Authorization')
  const [scheme, encoded = ''] = authorization.split(' ')
  let username = ''
  let password = ''

  if (scheme === 'Basic') {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8')
      const separator = decoded.indexOf(':')
      if (separator >= 0) {
        username = decoded.slice(0, separator)
        password = decoded.slice(separator + 1)
      }
    } catch {
      // 非法 Base64 与未携带凭证一样处理，不泄露内部解析细节。
    }
  }

  const configured = config.admin.username.length > 0 && config.admin.password.length > 0
  const valid = configured && safeEqual(username, config.admin.username) && safeEqual(password, config.admin.password)
  if (!valid) {
    ctx.status = 401
    ctx.set('WWW-Authenticate', 'Basic realm="Insight Monitor Admin", charset="UTF-8"')
    ctx.body = { code: 401, message: '需要管理员身份验证' }
    return
  }

  await next()
}

/**
 * 上报接口鉴权 + 请求体解析（W9-a）
 *
 * 两个设计决策：
 * 1. token 在 body 不在请求头——SDK 的 sendBeacon 不支持自定义头，
 *    而页面关闭时的可靠投递是硬需求，两套传输方式统一走 body
 * 2. 请求体是流只能读一次——解析和鉴权都在中间件做，通过后把数据
 *    挂到 ctx.state.reportData，控制器直接用，不重复读
 *
 * 用法：router.post('/api/report', reportAuth, handleReport)
 */
export async function reportAuth(ctx, next) {
  let parsed
  try {
    parsed = JSON.parse(await getRawBody(ctx))
  } catch (err) {
    if (err.message === 'BODY_TOO_LARGE') throw err
    ctx.status = 400
    ctx.body = { code: 400, message: '请求体不是合法的 JSON' }
    return
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    ctx.status = 400
    ctx.body = { code: 400, message: '请求体必须是包含 token 和 data 的对象' }
    return
  }

  // fail closed：服务端没配 token = 谁都不许报（防止忘配变裸奔）
  if (!config.reportToken || parsed.token !== config.reportToken) {
    ctx.status = 401
    ctx.body = { code: 401, message: '无效的上报令牌' }
    return
  }

  // 校验通过，把数据交给控制器
  ctx.state.reportData = parsed.data
  ctx.state.reportProjectId = Array.isArray(parsed.data) ? parsed.data[0]?.projectId : ''
  await next()
}
