/**
 * 访客唯一标识（visitorId）
 *
 * 设计决策（面试点）：
 * - 存 localStorage：同一浏览器多次访问视为同一访客，是 UV 统计的基础
 * - 不用 cookie：避免随请求自动上传，且受三方 Cookie 策略影响
 * - crypto.randomUUID 优先；http 环境或旧浏览器下降级到随机串
 */

const VISITOR_KEY = 'insight_visitor_id'

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = generateUuid()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    // 隐私模式 / 存储被禁用：返回本次会话临时 ID，不阻塞上报
    return generateUuid()
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
