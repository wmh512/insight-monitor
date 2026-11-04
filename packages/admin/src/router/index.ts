import { createRouter, createWebHistory } from 'vue-router'
import { restoreSession, sessionKnown } from '../stores/session'
import { currentUser } from '../stores/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: '管理员登录' } },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      redirect: '/errors',
      meta: { requiresAuth: true },
      children: [
        { path: 'errors', name: 'errors', component: () => import('../views/ErrorList.vue'), meta: { title: '错误列表' } },
        { path: 'errors/:id', name: 'error-detail', component: () => import('../views/ErrorDetail.vue'), meta: { title: '错误详情' } },
        { path: 'stats', name: 'stats', component: () => import('../views/Stats.vue'), meta: { title: '概览统计' } },
        { path: 'perf', name: 'perf', component: () => import('../views/PerfDashboard.vue'), meta: { title: '性能看板' } },
        { path: 'audit/login', name: 'audit-login', component: () => import('../views/AuditLogs.vue'), props: { category: 'auth' }, meta: { title: '访问记录', adminOnly: true } },
        { path: 'audit/operations', name: 'audit-operations', component: () => import('../views/AuditLogs.vue'), props: { category: 'operation' }, meta: { title: '操作审计', adminOnly: true } },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  document.title = `${to.meta.title || '管理后台'} · Insight 监控`
  if (!to.matched.some((record) => record.meta.requiresAuth)) return true
  if (sessionKnown.value) {
    if (to.meta.adminOnly && currentUser.value?.role !== 'admin') return { name: 'errors' }
    return true
  }
  if (await restoreSession()) {
    if (to.meta.adminOnly && currentUser.value?.role !== 'admin') return { name: 'errors' }
    return true
  }
  return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
