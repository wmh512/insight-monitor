// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectDeviceInfo } from './device'

describe('collectDeviceInfo 设备信息采集', () => {
  it('返回包含四个字段的完整对象', () => {
    const info = collectDeviceInfo()

    expect(info.ua).toBeTruthy()
    expect(info.screen).toMatch(/^\d+x\d+$/)
    expect(info.lang).toBeTruthy()
    expect(info.timezone).toBeTruthy()
  })

  it('所有字段都是字符串类型', () => {
    const info = collectDeviceInfo()

    Object.values(info).forEach((v) => expect(typeof v).toBe('string'))
  })

  it('浏览器环境不可读时安全降级，不影响监控主流程', () => {
    vi.spyOn(window, 'screen', 'get').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('denied') })

    expect(collectDeviceInfo()).toMatchObject({ screen: 'unknown', timezone: 'unknown' })
  })
})

afterEach(() => vi.restoreAllMocks())
