import Router from '@koa/router'
import {
  getErrorList,
  getErrorDetail,
  getStats,
  getPerfList,
  updateIssueStatus,
} from '../controllers/queryController.js'
import { adminAuth } from '../middlewares/auth.js'
import { requireAdmin, requireProjectAccess } from '../middlewares/session.js'
import { currentSession, login, logout } from '../middlewares/session.js'
import { listLoginAudit, listOperationAudit } from '../controllers/auditController.js'
import { listProjects } from '../controllers/projectController.js'

const router = new Router()

router.post('/api/auth/login', login)
router.post('/api/auth/logout', logout)
router.get('/api/auth/session', currentSession)
router.get('/api/projects', adminAuth, listProjects)
router.get('/api/errors', adminAuth, requireProjectAccess, getErrorList)
router.get('/api/errors/:id', adminAuth, requireProjectAccess, getErrorDetail)
router.get('/api/stats', adminAuth, requireProjectAccess, getStats)
router.get('/api/perf', adminAuth, requireProjectAccess, getPerfList)
// issue 生命周期：标记已解决 / 重新打开
router.patch('/api/issues/:fingerprint', adminAuth, requireAdmin, updateIssueStatus)
router.get('/api/audit/login', adminAuth, requireAdmin, listLoginAudit)
router.get('/api/audit/operations', adminAuth, requireAdmin, listOperationAudit)

export default router
