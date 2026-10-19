// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { getVisitorId } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('getVisitorId 访客标识', () => {
  it('格式符合 UUID v4', () => {
    // TODO 1: 断言 getVisitorId() 的返回值匹配 UUID_V4
    //   提示：expect(getVisitorId()).toMatch(UUID_V4)
    expect(getVisitorId()).toMatch(UUID_V4)
  })

  it('同一浏览器重复调用返回相同 ID（localStorage 持久化）', () => {
    // TODO 2: 连续调用两次，断言两次结果相等
    //   提示：const a = getVisitorId(); const b = getVisitorId(); expect(a).toBe(b)
    const first = getVisitorId()
    const second = getVisitorId()
    expect(first).toBe(second)
  })

  it('ID 被写入 localStorage', () => {
    // TODO 3: 先调用 getVisitorId() 拿到 id，
    //   再断言 localStorage.getItem('insight_visitor_id') 等于该 id
    const id = getVisitorId()
    expect(localStorage.getItem('insight_visitor_id')).toBe(id)
  })
})
