import config from '../config.js'

/** 只给明确允许的浏览器来源返回 CORS 许可；无 Origin 的服务端调用不受影响。 */
export async function cors(ctx, next) {
  const origin = ctx.get('Origin')
  const allowed = origin && config.corsOrigins.includes(origin)

  if (allowed) {
    ctx.set('Access-Control-Allow-Origin', origin)
    ctx.set('Vary', 'Origin')
  }
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (ctx.method === 'OPTIONS') {
    ctx.status = allowed ? 204 : 403
    return
  }
  await next()
}
