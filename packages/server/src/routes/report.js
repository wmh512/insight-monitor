import Router from '@koa/router'
import { handleReport } from '../controllers/reportController.js'
import { reportAuth } from '../middlewares/auth.js'

const router = new Router()

// 中间件先行：读请求体 + 验 token，通过才进控制器
router.post('/api/report', reportAuth, handleReport)

export default router
