import { selectedProject } from '../stores/project'
import api from './client'

export { api }

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
  return api.get(`/api/errors/${id}`, { params: { projectKey: selectedProject.value } })
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
