// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { collectDeviceInfo } from './device'

describe('collectDeviceInfo 设备信息采集', () => {
  it('返回包含四个字段的完整对象', () => {
    const info = collectDeviceInfo()

    // TODO 1: 断言 info.ua 是非空字符串
    //   提示：expect(info.ua).toBeTruthy()
    expect(info.ua).toBeTruthy()

    // TODO 2: 断言 info.screen 匹配 "数字x数字" 格式
    //   提示：expect(info.screen).toMatch(/^\d+x\d+$/)
    expect(info.screen).toMatch(/^\d+x\d+$/)

    // TODO 3: 断言 info.lang 非空
    expect(info.lang).toBeTruthy()

    // TODO 4: 断言 info.timezone 非空（如 Asia/Shanghai）
    expect(info.timezone).toBeTruthy()
  })

  it('所有字段都是字符串类型', () => {
    const info = collectDeviceInfo()

    // TODO 5: 遍历 Object.values(info)，断言每一项 typeof 都是 'string'
    //   提示：Object.values(info).forEach((v) => expect(typeof v).toBe('string'))
    Object.values(info).forEach((v) => expect(typeof v).toBe('string'))
  })
})
