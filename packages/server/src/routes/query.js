import Router from '@koa/router'
import {
  getErrorList,
  getErrorDetail,
  getStats,
  getPerfList,
  updateIssueStatus,
} from '../controllers/queryController.js'

const router = new Router()

router.get('/api/errors', getErrorList)
router.get('/api/errors/:id', getErrorDetail)
router.get('/api/stats', getStats)
router.get('/api/perf', getPerfList)
// issue 生命周期：标记已解决 / 重新打开
router.patch('/api/issues/:fingerprint', updateIssueStatus)

export default router
