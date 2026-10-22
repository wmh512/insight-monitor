import { isDebug } from '../config'

/**
 * SDK 自我保护：内部异常必须静默，绝不影响宿主页面
 *
 * 为什么抽成公共模块：error.ts 和 performance.ts 都需要，
 * 监控代码自己成为故障源，比没有监控更糟。
 */
export function guard(fn: () => void): void {
  try {
    fn()
  } catch (e) {
    if (isDebug()) console.error('[insight-sdk] 内部异常（已静默）:', e)
  }
}

/** debug 模式日志：生产环境（debug: false）完全不输出 */
export function debugLog(...args: unknown[]): void {
  if (isDebug()) console.info('[insight-sdk]', ...args)
}
