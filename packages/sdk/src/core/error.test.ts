// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { setOptions } from '../config'
import { startErrorCapture } from './error'
import type { ReportData } from '../types'

// 用稳定的 listener 引用 + beforeEach 重置数组：
// startErrorCapture 是幂等的，只有第一次注册生效，
// 但 captured 每个用例重新赋值，保证断言的是当前用例的数据
let captured: ReportData[] = []
const listener = (data: ReportData) => captured.push(data)

beforeEach(() => {
  captured = []
  setOptions({ projectId: 'test_project', reportUrl: 'http://localhost/api/report' })
  startErrorCapture(listener)
})

describe('core/error 错误捕获', () => {
  it('捕获 JS 运行时错误（window.onerror）', () => {
    const err = new Error('boom')
    window.onerror?.('boom', 'app.js', 10, 20, err)
    expect(captured).toHaveLength(1)
    expect(captured[0].type).toBe('error')
    expect(captured[0].projectId).toBe('test_project')
    expect(captured[0].error?.kind).toBe('js')
    expect(captured[0].error?.message).toBe('boom')
    expect(captured[0].error?.stack).toContain('boom')
  })

  it('onerror 没有 error 对象时降级使用 message', () => {
    window.onerror?.('something broke', 'app.js', 1, 1, undefined)
    expect(captured[0].error?.message).toBe('something broke')
    expect(captured[0].error?.stack).toBe('')
  })

  it('捕获 Promise 未处理拒绝', () => {
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    ;(event as unknown as { reason: unknown }).reason = new Error('promise failed')
    window.dispatchEvent(event)
    expect(captured).toHaveLength(1)
    expect(captured[0].error?.kind).toBe('promise')
    expect(captured[0].error?.message).toBe('promise failed')
  })

  it('Promise reject 非 Error 值时正确归一化', () => {
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    ;(event as unknown as { reason: unknown }).reason = 'plain string reason'
    window.dispatchEvent(event)
    expect(captured[0].error?.message).toBe('plain string reason')
  })

  it('捕获资源加载失败（capture 阶段）', () => {
    const img = document.createElement('img')
    img.src = 'https://example.com/missing.png'
    document.body.appendChild(img)
    img.dispatchEvent(new Event('error'))
    expect(captured).toHaveLength(1)
    expect(captured[0].error?.kind).toBe('resource')
    expect(captured[0].error?.resourceUrl).toBe('https://example.com/missing.png')
    img.remove()
  })

  it('window 自身的 error 事件不会产生 resource 类型上报（target 校验）', () => {
    window.dispatchEvent(new Event('error'))
    // 注意：jsdom 中派发 error 事件会同时触发 window.onerror（走 js 链路），
    // 因此不能断言 captured 为空；要验证的是资源监听器跳过了 target 为 window 的事件
    const resourceReports = captured.filter((d) => d.error?.kind === 'resource')
    expect(resourceReports).toHaveLength(0)
  })

  it('相同错误对象产生相同指纹，不同错误指纹不同', () => {
    // 必须复用同一个 Error 对象：stack 中包含 new Error() 所在行的行号，
    // 分两行创建两个 Error 会导致堆栈不同、指纹不同（这正是 P004 记录的知识点）
    const err = new Error('same')
    window.onerror?.('same', 'app.js', 1, 1, err)
    window.onerror?.('same', 'app.js', 1, 1, err)
    expect(captured[0].error?.fingerprint).toBe(captured[1].error?.fingerprint)

    window.onerror?.('different', 'app.js', 2, 1, new Error('different'))
    expect(captured[2].error?.fingerprint).not.toBe(captured[0].error?.fingerprint)
  })

  it('重复调用 startErrorCapture 不会重复注册（幂等）', () => {
    startErrorCapture(() => {})
    window.onerror?.('dup', 'app.js', 1, 1, new Error('dup'))
    expect(captured).toHaveLength(1)
  })

  it('上报数据包含完整公共字段', () => {
    window.onerror?.('check fields', 'app.js', 1, 1, new Error('check fields'))
    const data = captured[0]
    expect(data.pageUrl).toBeTruthy()
    expect(data.timestamp).toBeGreaterThan(0)
    expect(data.visitorId).toBeTruthy()
    expect(data.device.ua).toBeTruthy()
  })
})
