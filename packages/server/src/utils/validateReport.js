const ERROR_KINDS = new Set(['js', 'promise', 'resource'])

function isText(value, max = 500) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

function isMetric(value) {
  return Number.isFinite(value) && value >= 0 && value <= 600000
}

/** 对外输入的边界校验：校验通过后才允许访问项目与写入数据库。 */
export function validateReportBatch(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 20) {
    return 'data 必须是包含 1-20 条记录的数组'
  }

  const projectId = list[0]?.projectId
  if (!isText(projectId, 64)) return 'projectId 必须是 1-64 字符的字符串'

  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return '每条上报记录必须是对象'
    if (item.projectId !== projectId) return '同一批次不能混入不同 projectId'
    if (!isText(item.pageUrl, 500)) return 'pageUrl 必须是 1-500 字符的字符串'
    if (!Number.isSafeInteger(item.timestamp) || item.timestamp <= 0)
      return 'timestamp 必须是正整数时间戳'
    if (item.device?.ua && !isText(item.device.ua, 500)) return 'device.ua 不能超过 500 字符'

    if (item.type === 'error') {
      const error = item.error
      if (!error || typeof error !== 'object') return '错误记录缺少 error'
      if (!ERROR_KINDS.has(error.kind)) return 'error.kind 必须是 js / promise / resource'
      if (!isText(error.message, 500) || !isText(error.fingerprint, 64))
        return '错误 message 或 fingerprint 不合法'
      if (typeof error.stack !== 'string' || error.stack.length > 4000)
        return 'error.stack 不能超过 4000 字符'
    } else if (item.type === 'performance') {
      if (
        !item.perf ||
        !isMetric(item.perf.FP) ||
        !isMetric(item.perf.FCP) ||
        !isMetric(item.perf.LCP)
      ) {
        return 'performance 需要非负且有限的 FP / FCP / LCP'
      }
    } else {
      return 'type 必须是 error 或 performance'
    }
  }

  return null
}
