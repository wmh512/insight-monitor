// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReportData } from '../types'

/**
 * 队列测试策略：
 * 不 mock 传输层（保持真实链路），而是 stub 全局 fetch——
 * jsdom 没有 sendBeacon，传输层会自动降级到 fetch，正好被我们控制。
 */

let queueModule: typeof import('./queue')
let fetchMock: ReturnType<typeof vi.fn>

/** 等待 Promise 链全部跑完：一条链最多约 5 个微任务 tick，等 5 次保险 */
async function flushPromises() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()

  }
}

function makeData(type: 'error' | 'performance' = 'error'): ReportData {
  return {
    type,
    projectId: 'test_project',
    pageUrl: 'http://localhost/',
    timestamp: 1770000000000,
    visitorId: 'visitor-1',
    device: { ua: 'test-ua', screen: '100x100', lang: 'zh-CN', timezone: 'Asia/Shanghai' },
    ...(type === 'error'
      ? { error: { kind: 'js' as const, message: 'boom', stack: '', fingerprint: 'fp-1' } }
      : { perf: { FP: 100, FCP: 200, LCP: 300 } }),
  }
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  localStorage.clear()
  fetchMock = vi.fn(() => Promise.resolve({}))
  vi.stubGlobal('fetch', fetchMock)

  const config = await import('../config')
  config.setOptions({
    projectId: 'test_project',
    reportUrl: 'http://localhost/api/report',
    maxQueueSize: 3, // 测试用小批量的门槛，3 条就发
    flushInterval: 1000,
  })
  queueModule = await import('./queue')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('report/queue 上报队列', () => {
  it('攒够 maxQueueSize 条自动整批发送', async () => {
    queueModule.add(makeData())
    queueModule.add(makeData())
    expect(fetchMock).not.toHaveBeenCalled() // 2 条未满 3，不发

    queueModule.add(makeData()) // 第 3 条，触发
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    // 第一批应该是 3 条
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toHaveLength(3)
  })

  it('flush 取出整批后队列清空，后续数据进下一批', async () => {
    queueModule.add(makeData())
    queueModule.add(makeData())
    queueModule.add(makeData())
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    queueModule.add(makeData()) // 新数据，只有 1 条，不触发
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(1) // 没有第二次发送

    queueModule.flush() // 手动强制发
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const body = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(body).toHaveLength(1)
  })

  it('定时器到点强制发送（攒不满也发）', async () => {
    queueModule.startQueue()
    queueModule.add(makeData())
    queueModule.add(makeData()) // 只有 2 条，不满批

    await vi.advanceTimersByTimeAsync(1000) // 1 秒定时器到点
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('发送失败时整批存入 localStorage', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))
    queueModule.add(makeData())
    queueModule.add(makeData())
    queueModule.add(makeData())
    await flushPromises()
    await flushPromises() // 多等一轮微任务，让 .then 里的暂存逻辑跑完

    const stored = JSON.parse(localStorage.getItem('insight_failed_reports') ?? '[]')
    expect(stored).toHaveLength(3)
  })

  it('startQueue 时补发 localStorage 中暂存的数据', async () => {
    localStorage.setItem(
      'insight_failed_reports',
      JSON.stringify([makeData(), makeData()]),
    )
    queueModule.startQueue()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toHaveLength(2)
  })

  it('采样率为 0 时 performance 数据被丢弃，error 数据全收', async () => {
    const config = await import('../config')
    config.setOptions({
      projectId: 'test_project',
      reportUrl: 'http://localhost/api/report',
      maxQueueSize: 3,
      perfSampleRate: 0,
    })
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 任意随机值，0 采样率下全丢

    queueModule.add(makeData('performance'))
    queueModule.add(makeData('performance'))
    queueModule.add(makeData('performance'))
    queueModule.add(makeData('error'))
    queueModule.add(makeData('error'))
    queueModule.add(makeData('error'))
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1) // 只有 3 条 error 触发发送
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.every((d: ReportData) => d.type === 'error')).toBe(true)
  })

  it('脏数据容错：localStorage 里不是数组时按无暂存处理', async () => {
    localStorage.setItem('insight_failed_reports', '这不是数组')
    expect(() => queueModule.startQueue()).not.toThrow()
    await flushPromises()
    expect(fetchMock).not.toHaveBeenCalled() // 没有可补发的数据
  })
})
