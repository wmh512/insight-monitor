import { describe, expect, it } from 'vitest'
import { init, SDK_VERSION } from './index'

describe('insight-sdk Phase 0 占位', () => {
  it('导出版本号 0.1.0', () => {
    expect(SDK_VERSION).toBe('0.1.0')
  })

  it('init 缺少必填参数时不抛错', () => {
    expect(() => init({ projectId: '', reportUrl: '' })).not.toThrow()
  })

  it('init 参数合法时正常执行', () => {
    expect(() =>
      init({ projectId: 'demo', reportUrl: 'https://example.com/api/report' }),
    ).not.toThrow()
  })
})
