import Router from '@koa/router'
import { handleReport } from '../controllers/reportController.js'

const router = new Router()

router.post('/api/report', handleReport)

export default router
