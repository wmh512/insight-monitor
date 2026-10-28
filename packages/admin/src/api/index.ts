import axios from 'axios'

// axios 实例：后台所有 API 调用的唯一出口
// TODO(W9 完善)：改为环境变量注入（dev=localhost:3000 / prod=相对路径走 Nginx 代理），
// 现在为线上演示临时硬编码云服务器地址
const api = axios.create({
  baseURL: 'http://114.132.238.83:3000',
  timeout: 10000,
})

// 响应拦截器：成功剥壳、失败统一处理——这是选 axios 不选 fetch 的核心原因
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[api] 请求失败:', error.message)
    return Promise.reject(error)
  },
)

// ===== 三个查询接口的封装（契约来自 W5-01）=====

/** issue 生命周期状态（W9-d 状态机） */
export type IssueStatus = 'unseen' | 'seen' | 'resolved'

/** 错误列表项（接口返回的数据形状） */
export interface ErrorListItem {
  id: number
  fingerprint: string
  kind: string
  message: string
  cnt: number
  last_seen: string
  /** 生命周期状态 */
  status: IssueStatus
  /** 累计通知次数 */
  notify_count: number
}

/** 错误列表（按指纹聚合 + 分页） */
export function getErrorList(params: { projectKey: string; page?: number; pageSize?: number }) {
  return api.get('/api/errors', { params })
}

/** 更新 issue 状态（标记已解决 / 重新打开）——状态机的人工干预入口 */
export function setIssueStatus(fingerprint: string, status: IssueStatus) {
  return api.patch(`/api/issues/${fingerprint}`, { status })
}

/** 错误详情（按主键） */
export function getErrorDetail(id: number) {
  return api.get(`/api/errors/${id}`)
}

/** 性能记录（图表数据源） */
export interface PerfRecord {
  id: number
  fp: number | null
  fcp: number | null
  lcp: number | null
  page_url: string
  created_at: string
}

export function getPerfList(params: { projectKey: string; page?: number; pageSize?: number }) {
  return api.get('/api/perf', { params })
}

/** 概览统计 */
export function getStats(projectKey: string) {
  return api.get('/api/stats', { params: { projectKey } })
}
