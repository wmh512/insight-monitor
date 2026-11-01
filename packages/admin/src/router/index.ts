import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'

let sessionKnown = false

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
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  document.title = `${to.meta.title || '管理后台'} · Insight 监控`
  if (!to.matched.some((record) => record.meta.requiresAuth)) return true
  if (sessionKnown) return true
  try {
    await axios.get('/api/stats', { params: { projectKey: 'demo_project_key_001' } })
    sessionKnown = true
    return true
  } catch {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

router.afterEach((to) => {
  if (to.name === 'login') sessionKnown = false
})

export default router
