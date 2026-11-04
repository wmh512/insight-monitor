import { api } from './index'

export interface AuditRecord {
  id: number
  category: 'auth' | 'operation'
  event_type: 'login' | 'logout' | 'issue.status.update'
  actor_username: string
  result: 'success' | 'failure'
  failure_reason: string
  ip: string
  user_agent: string
  target_type: string | null
  target_id: string | null
  change_summary: string | null
  created_at: string
}

export interface AuditQuery {
  page?: number
  pageSize?: number
  username?: string
  eventType?: string
  result?: string
  ip?: string
  startTime?: string
  endTime?: string
}

export function getLoginAudit(params: AuditQuery) {
  return api.get('/api/audit/login', { params }) as Promise<{ data: { list: AuditRecord[]; total: number } }>
}

export function getOperationAudit(params: AuditQuery) {
  return api.get('/api/audit/operations', { params }) as Promise<{ data: { list: AuditRecord[]; total: number } }>
}

export function browserSummary(userAgent: string) {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Firefox\//.test(userAgent) ? 'Firefox' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : '未知浏览器'
  const os = /Windows/.test(userAgent) ? 'Windows' : /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : '未知系统'
  return userAgent ? `${browser} / ${os}` : '-'
}
