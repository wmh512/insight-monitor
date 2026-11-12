// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVisitorId } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('getVisitorId 访客标识', () => {
  beforeEach(() => localStorage.clear())

  it('格式符合 UUID v4', () => {
    expect(getVisitorId()).toMatch(UUID_V4)
  })

  it('同一浏览器重复调用返回相同 ID（localStorage 持久化）', () => {
    const first = getVisitorId()
    const second = getVisitorId()
    expect(first).toBe(second)
  })

  it('ID 被写入 localStorage', () => {
    const id = getVisitorId()
    expect(localStorage.getItem('insight_visitor_id')).toBe(id)
  })

  it('存储不可用时返回合法临时 ID，不抛出异常', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })

    expect(getVisitorId()).toMatch(UUID_V4)
  })
})
