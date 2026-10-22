import type { DeviceInfo } from '../types'

/**
 * 采集设备与环境信息
 *
 * 设计决策：
 * 1. 只采集排障必需字段，不采集任何隐私数据（无 cookie、无指纹追踪）
 * 2. 不做 UA 解析 —— 解析放服务端（P2），SDK 保持零依赖 + 体积可控
 * 3. 所有读取都有 try/catch 降级，任何环境异常不影响主流程
 */
export function collectDeviceInfo(): DeviceInfo {
  return {
    ua: safeGet(() => navigator.userAgent) ?? 'unknown',
    screen:
      safeGet(() => {
        const s = window.screen
        return s ? `${s.width}x${s.height}` : 'unknown'
      }) ?? 'unknown',
    lang: safeGet(() => navigator.language) ?? 'unknown',
    timezone: safeGetTimezone(),
  }
}

function safeGet<T>(getter: () => T): T | undefined {
  try {
    return getter()
  } catch {
    return undefined
  }
}

function safeGetTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  } catch {
    return 'unknown'
  }
}
