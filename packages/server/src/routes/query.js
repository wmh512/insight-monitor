import Router from '@koa/router'
import { getErrorList, getErrorDetail, getStats } from '../controllers/queryController.js'

const router = new Router()

router.get('/api/errors', getErrorList)
router.get('/api/errors/:id', getErrorDetail)
router.get('/api/stats', getStats)

export default router
