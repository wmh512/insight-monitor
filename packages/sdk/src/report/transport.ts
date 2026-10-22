import type { ReportData } from '../types'
import { getOptions } from '../config'
import { debugLog } from '../utils/safe'

/**
 * 传输层：把一批数据发到服务端
 *
 * 两个关键设计：
 *
 * 1. sendBeacon 优先
 *    sendBeacon 是浏览器专门为“埋点上报”设计的 API：
 *    浏览器保证即使页面正在关闭，也会把数据投递到服务端。
 *    普通 fetch 做不到——页面卸载时异步请求会被浏览器直接中止。
 *    监控数据最值钱的场景恰恰是“出错的页面被用户关掉了”。
 *
 * 2. Content-Type 用 text/plain 而不是 application/json
 *    跨域上报如果用 application/json 会触发 CORS 预检（OPTIONS 请求），
 *    多一次往返、老浏览器还有兼容问题。
 *    text/plain 属于“简单请求”，不预检；代价是服务端要手动 JSON.parse。
 *    Sentry 等成熟 SDK 同样这么做。
 */

/**
 * 发送一批上报数据
 * @returns Promise<boolean> true = 投递成功；false = 失败（队列会存入 localStorage 重发）
 */
export function sendReport(payload: ReportData[]): Promise<boolean> {
  const { reportUrl } = getOptions()
  const body = JSON.stringify(payload)

  // ---- 优先 sendBeacon ----
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      // sendBeacon 是同步方法：返回 true = 浏览器已接收投递请求（不代表服务端收到）
      const queued = navigator.sendBeacon(reportUrl, body)
      if (queued) {
        debugLog(`sendBeacon 投递成功，条数: ${payload.length}`)
        return Promise.resolve(true)
      }
      // 返回 false：浏览器拒绝（通常是数据超过 sendBeacon 大小上限，约 64KB）
      debugLog('sendBeacon 被拒绝（可能超限），降级 fetch')
    } catch {
      debugLog('sendBeacon 抛错，降级 fetch')
    }
  }

  // ---- 兜底 fetch ----
  return fetch(reportUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    keepalive: true, // fetch 版的“准 beacon”：页面卸载后请求继续
  })
    .then(() => true)
    .catch(() => false)
}
