import { describe, expect, it } from 'vitest'
import { cyrb53 } from './hash'

describe('cyrb53 哈希', () => {
  it('相同输入产生相同输出', () => {
    expect(cyrb53('TypeError: x is undefined')).toBe(cyrb53('TypeError: x is undefined'))
  })

  it('不同输入产生不同输出', () => {
    expect(cyrb53('error A')).not.toBe(cyrb53('error B'))
  })

  it('空字符串返回稳定哈希且不抛错', () => {
    expect(cyrb53('')).toBe(cyrb53(''))
    expect(cyrb53('')).toMatch(/^[0-9a-z]+$/)
  })

  it('超长输入（10KB 模拟堆栈）正常工作', () => {
    const long = 'at foo (app.js:1:1)'.padEnd(10000, 'x')
    expect(cyrb53(long)).toMatch(/^[0-9a-z]+$/)
  })

  it('seed 相同结果可复现，不同则结果不同', () => {
    expect(cyrb53('abc', 1)).toBe(cyrb53('abc', 1))
    expect(cyrb53('abc', 1)).not.toBe(cyrb53('abc', 2))
  })

  it('输入仅差一个字符，输出显著不同（雪崩效应抽查）', () => {
    expect(cyrb53('at foo (app.js:1:1)')).not.toBe(cyrb53('at foo (app.js:1:2)'))
  })
})
