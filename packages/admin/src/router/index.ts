import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(), // history 模式：URL 没有 #，干净
  routes: [
    { path: '/', redirect: '/errors' },
    {
      path: '/errors',
      name: 'errors',
      component: () => import('../views/ErrorList.vue'), // 懒加载：用到才加载
      meta: { title: '错误列表' },
    },
    {
      path: '/errors/:id',
      name: 'error-detail',
      component: () => import('../views/ErrorDetail.vue'),
      meta: { title: '错误详情' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/Stats.vue'),
      meta: { title: '概览统计' },
    },
  ],
})

export default router
