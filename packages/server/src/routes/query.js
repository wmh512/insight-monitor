import Router from '@koa/router'
import {
  getErrorList,
  getErrorDetail,
  getStats,
  getPerfList,
  updateIssueStatus,
} from '../controllers/queryController.js'
import { adminAuth } from '../middlewares/auth.js'

const router = new Router()

router.get('/api/errors', adminAuth, getErrorList)
router.get('/api/errors/:id', adminAuth, getErrorDetail)
router.get('/api/stats', adminAuth, getStats)
router.get('/api/perf', adminAuth, getPerfList)
// issue 生命周期：标记已解决 / 重新打开
router.patch('/api/issues/:fingerprint', adminAuth, updateIssueStatus)

export default router
