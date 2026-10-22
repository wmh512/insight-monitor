import type { PerfMetrics, ReportData } from '../types'
import { getOptions } from '../config'
import { collectDeviceInfo } from '../utils/device'
import { getVisitorId } from '../utils/uuid'
import { debugLog, guard } from '../utils/safe'

/** 性能数据就绪回调（W2 起由上报队列消费） */
export type PerfListener = (data: ReportData) => void

let listener: PerfListener | null = null
let started = false
let flushed = false

/** 最新指标：LCP 会多次触发，始终保留最后一次 */
let latest: PerfMetrics = { FP: 0, FCP: 0, LCP: 0 }

/**
 * 启动性能采集（幂等）
 *
 * 采集三个指标：
 * - FP  First Paint            首次绘制（屏幕上出现任何像素）
 * - FCP First Contentful Paint 首次内容绘制（出现第一个文字/图片）
 * - LCP Largest Contentful Paint 最大内容绘制（主内容渲染完成）
 *
 * 两个关键设计：
 * 1. buffered: true —— SDK 是后加载的，FP/FCP 往往已经发生过了。
 *    buffered 让浏览器把历史条目补发出来，否则永远采不到。
 * 2. LCP 取最后一次 —— LCP 在页面加载过程中会触发多次
 *    （大图片加载完成会刷新 LCP），最后一次才是最终值。
 */
export function startPerformanceCapture(onPerf: PerfListener): void {
  if (started || typeof window === 'undefined') return
  started = true
  listener = onPerf

  // 老旧浏览器没有 PerformanceObserver：静默放弃，不影响页面
  if (typeof PerformanceObserver === 'undefined') {
    debugLog('PerformanceObserver 不支持，性能采集已跳过')
    return
  }

  try {
    // ---- FP / FCP：paint 类型条目 ----
    const paintObserver = new PerformanceObserver((list) => {
      guard(() => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-paint') {
            latest.FP = Math.round(entry.startTime)
          }
          if (entry.name === 'first-contentful-paint') {
            latest.FCP = Math.round(entry.startTime)
          }
        }
      })
    })
    paintObserver.observe({ type: 'paint', buffered: true })

    // ---- LCP：largest-contentful-paint 类型条目 ----
    const lcpObserver = new PerformanceObserver((list) => {
      guard(() => {
        const entries = list.getEntries()
        // 一次回调可能带多条，取最后一条 = 当前最新 LCP
        if (entries.length > 0) {
          latest.LCP = Math.round(entries[entries.length - 1].startTime)
        }
      })
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {
    debugLog('性能采集初始化失败（已静默）:', e)
    return
  }

  // ---- 上报时机 1：页面隐藏/切走（此刻 LCP 定格为最终值）----
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // ---- 上报时机 2：pagehide（移动端 Safari 更可靠）----
  window.addEventListener('pagehide', flush)

  // ---- 上报时机 3：兜底定时器（用户一直不切页，10 秒后也报一次）----
  setTimeout(flush, 10000)
}

/** 组装并发出性能数据（整个会话只发一次） */
function flush(): void {
  if (flushed || !listener) return
  // 三个指标全是 0 说明什么都没采到，不上报脏数据
  if (latest.FP === 0 && latest.FCP === 0 && latest.LCP === 0) return
  flushed = true
  listener(buildReportData({ ...latest }))
}

function buildReportData(perf: PerfMetrics): ReportData {
  const { projectId } = getOptions()
  return {
    type: 'performance',
    projectId,
    pageUrl: typeof location !== 'undefined' ? location.href : '',
    timestamp: Date.now(),
    visitorId: getVisitorId(),
    device: collectDeviceInfo(),
    perf,
  }
}
