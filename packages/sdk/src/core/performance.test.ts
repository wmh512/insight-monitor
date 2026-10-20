// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReportData } from '../types'

/**
 * jsdom 没有 PerformanceObserver，需要 mock。
 * 测试策略：mock 全局 PerformanceObserver，拿到内部回调，
 * 手动"喂"性能条目，模拟浏览器行为。
 */

type EntryCallback = (list: { getEntries: () => PerformanceEntry[] }) => void

let captured: ReportData[] = []
let paintCallback: EntryCallback | null = null
let lcpCallback: EntryCallback | null = null

class MockPerformanceObserver {
  private cb: EntryCallback
  constructor(cb: EntryCallback) {
    this.cb = cb
  }
  observe(options: { type: string; buffered?: boolean }) {
    if (options.type === 'paint') paintCallback = this.cb
    if (options.type === 'largest-contentful-paint') lcpCallback = this.cb
  }
  disconnect() {}
}

/** 每个用例都重新加载模块，保证 started/flushed/latest 状态是干净的 */
async function setup(withObserver = true) {
  vi.resetModules()
  captured = []
  paintCallback = null
  lcpCallback = null
  if (withObserver) {
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver)
  } else {
    vi.unstubAllGlobals()
  }
  const config = await import('../config')
  config.setOptions({ projectId: 'test_project', reportUrl: 'http://localhost/api/report' })
  const perf = await import('./performance')
  perf.startPerformanceCapture((data) => captured.push(data))
}

function firePaint(entries: { name: string; startTime: number }[]) {
  paintCallback?.({ getEntries: () => entries as unknown as PerformanceEntry[] })
}

function fireLcp(startTime: number) {
  lcpCallback?.({
    getEntries: () =>
      [{ name: 'largest-contentful-paint', startTime } as unknown as PerformanceEntry],
  })
}

/** 模拟页面被隐藏（visibilitychange 是 LCP 定格并上报的时机） */
function hidePage() {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  window.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(async () => {
  vi.useFakeTimers()
  await setup()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

describe('core/performance 性能采集', () => {
  it('采集 FP / FCP 并在页面隐藏时上报', () => {
    firePaint([
      { name: 'first-paint', startTime: 250 },
      { name: 'first-contentful-paint', startTime: 800 },
    ])
    hidePage()
    expect(captured).toHaveLength(1)
    expect(captured[0].type).toBe('performance')
    expect(captured[0].perf?.FP).toBe(250)
    expect(captured[0].perf?.FCP).toBe(800)
  })

  it('LCP 多次触发时取最后一次', () => {
    fireLcp(1000)
    fireLcp(2000)
    fireLcp(3000)
    hidePage()
    expect(captured).toHaveLength(1)
    expect(captured[0].perf?.LCP).toBe(3000)
  })

  it('一次回调带多条 LCP 时取最后一条', () => {
    lcpCallback?.({
      getEntries: () =>
        [
          { name: 'largest-contentful-paint', startTime: 1500 },
          { name: 'largest-contentful-paint', startTime: 2600 },
        ] as unknown as PerformanceEntry[],
    })
    hidePage()
    expect(captured[0].perf?.LCP).toBe(2600)
  })

  it('指标全为 0 时不上报（避免脏数据）', () => {
    hidePage()
    expect(captured).toHaveLength(0)
  })

  it('重复 flush 只上报一次', () => {
    firePaint([{ name: 'first-paint', startTime: 100 }])
    hidePage()
    hidePage()
    expect(captured).toHaveLength(1)
  })

  it('兜底定时器：用户不切页时 10 秒后也上报', () => {
    firePaint([{ name: 'first-paint', startTime: 120 }])
    vi.advanceTimersByTime(10000)
    expect(captured).toHaveLength(1)
    expect(captured[0].perf?.FP).toBe(120)
  })

  it('无 PerformanceObserver 时静默降级不抛错', async () => {
    await setup(false) // 重新加载模块，且不 mock PerformanceObserver
    expect(() => hidePage()).not.toThrow()
    expect(captured).toHaveLength(0)
  })

  it('上报数据包含完整公共字段', () => {
    firePaint([{ name: 'first-paint', startTime: 300 }])
    hidePage()
    const data = captured[0]
    expect(data.projectId).toBe('test_project')
    expect(data.pageUrl).toBeTruthy()
    expect(data.timestamp).toBeGreaterThan(0)
    expect(data.visitorId).toBeTruthy()
    expect(data.device.ua).toBeTruthy()
  })
})
