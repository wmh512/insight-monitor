import config from '../config.js'
import { getRawBody } from '../utils/rawBody.js'

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
  } catch {
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
  await next()
}
