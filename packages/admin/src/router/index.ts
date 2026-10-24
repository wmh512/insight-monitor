import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      redirect: '/errors',
      children: [
        { path: 'errors', name: 'errors', component: () => import('../views/ErrorList.vue'), meta: { title: '错误列表' } },
        { path: 'errors/:id', name: 'error-detail', component: () => import('../views/ErrorDetail.vue'), meta: { title: '错误详情' } },
        { path: 'stats', name: 'stats', component: () => import('../views/Stats.vue'), meta: { title: '概览统计' } },
        { path: 'perf', name: 'perf', component: () => import('../views/PerfDashboard.vue'), meta: { title: '性能看板' } },
      ],
    },
  ],
})

export default router
