import Koa from 'koa'
import router from './routes/report.js'
import queryRouter from './routes/query.js'


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
// Allow-Methods 要覆盖所有对外暴露的方法——新增 PATCH 等非简单方法时必须同步加，
// 否则浏览器预检（OPTIONS）直接拦掉请求（前端表现为"点了没反应"）
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type')
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }
  await next()
})

// 中间件 3：路由
app.use(router.routes())
app.use(queryRouter.routes())

export default app
