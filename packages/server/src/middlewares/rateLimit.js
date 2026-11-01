import config from '../config.js'

const buckets = new Map()

/** 单进程滑动窗口限流：限制写入压力，不把它冒充分布式限流。 */
export async function reportRateLimit(ctx, next) {
  const now = Date.now()
  const windowMs = 60000
  const key = `${ctx.ip}:${ctx.state.reportProjectId}`
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs)

  if (recent.length >= config.reportRateLimit) {
    ctx.status = 429
    ctx.set('Retry-After', '60')
    ctx.body = { code: 429, message: '上报过于频繁，请稍后重试' }
    return
  }

  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 1000) {
    for (const [bucketKey, times] of buckets) {
      if (!times.some((time) => now - time < windowMs)) buckets.delete(bucketKey)
    }
  }
  await next()
}

export function resetRateLimits() {
  buckets.clear()
}
