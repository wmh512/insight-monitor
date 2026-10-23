import Koa from 'koa'
import router from './routes/report.js'

const app = new Koa()

// 中间件 1：错误处理（最外层，包住所有里层的炸）
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    console.error('[server] 未捕获异常:', err)
    ctx.status = 500
    ctx.body = { code: 500, message: '服务器内部错误' }
  }
})

// 中间件 2：CORS（SDK 从别的页面发请求，浏览器要这个许可证）
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }
  await next()
})

// 中间件 3：路由
app.use(router.routes())

export default app
