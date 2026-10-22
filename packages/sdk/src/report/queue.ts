import type { ReportData } from '../types'
import { getOptions } from '../config'
import { debugLog } from '../utils/safe'
import { sendReport } from './transport'

/**
 * 上报队列（W2 核心模块）
 *
 * 解决三个工程问题：
 * 1. 发得太频繁 —— 攒够一批再发（maxQueueSize / flushInterval）
 * 2. 发了失败怎么办 —— 存 localStorage，下次打开页面补发
 * 3. 页面关了没发完 —— pagehide 强制 flush + sendBeacon 保活投递
 */

/** localStorage 中暂存失败数据的键名 */
const STORAGE_KEY = 'insight_failed_reports'

/** 暂存数据量上限，防止无限膨胀撑爆存储 */
const MAX_STORED = 100

/** 模块级状态（单例：整个页面只有一个队列） */
let queue: ReportData[] = []
let flushing = false
let started = false

/**
 * 数据入队（error.ts / performance.ts 的回调入口）
 * 采集模块只管产数据，不管怎么发——职责分离
 */
export function add(data: ReportData): void {
  const options = getOptions()

  // 采样率：性能数据按概率入队（错误数据永远全收）
  // 例：perfSampleRate = 0.3 → 只保留 30% 的性能数据，降低服务端压力
  if (data.type === 'performance' && Math.random() > options.perfSampleRate) {
    return
  }

  queue.push(data)

  // 攒够一批，立刻发（不满批的等 5 秒定时器或页面关闭）
  if (queue.length >= options.maxQueueSize) {
    flush()
  }
}

/**
 * 把当前队列整批发走
 * 注意：这是“取出-清空-发送”三步，取出期间新数据进下一批，不会被卡住
 */
export function flush(): void {
  // 并发保护：上一批还没发完，直接返回（数据在队列里，下一批带走）
  if (flushing || queue.length === 0) return
  flushing = true

  const batch = queue
  queue = []

  sendReport(batch).then((ok) => {
    if (!ok) {
      // 发送失败：整批存 localStorage，等下次启动补发
      saveFailed(batch)
      debugLog(`本批 ${batch.length} 条发送失败，已暂存，等待下次补发`)
    } else {
      debugLog(`本批 ${batch.length} 条发送成功`)
    }
    flushing = false
  })
}

/**
 * 启动队列（init 时调用一次）
 * 三件事：补发历史暂存 + 定时 flush + 页面关闭前 flush
 */
export function startQueue(): void {
  if (started || typeof window === 'undefined') return
  started = true

  // 1. 补发：上次失败暂存的数据，入队后立即尝试发送
  const failed = loadFailed()
  if (failed.length > 0) {
    queue.push(...failed)
    debugLog(`发现暂存的 ${failed.length} 条失败数据，开始补发`)
    flush()
  }

  // 2. 定时 flush：每 flushInterval 毫秒强扫一次（攒不满也发）
  setInterval(() => flush(), getOptions().flushInterval)

  // 3. 页面隐藏/关闭：最后一搏（配合 sendBeacon，关闭前必须发完）
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', () => flush())
}

// ---- localStorage 暂存（失败重发的实现）----

function saveFailed(batch: ReportData[]): void {
  try {
    const merged = [...loadFailed(), ...batch]
    // 只保留最后 MAX_STORED 条，防止存储无限膨胀
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(-MAX_STORED)))
  } catch {
    debugLog('暂存失败数据失败（存储可能已满或被禁用）')
  }
}

function loadFailed(): ReportData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    // 容错：取出来的不是数组就当作没有（脏数据不信任）
    return Array.isArray(parsed) ? (parsed as ReportData[]) : []
  } catch {
    return []
  }
}
