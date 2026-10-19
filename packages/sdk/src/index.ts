import { setOptions } from './config'
import { startErrorCapture } from './core/error'
import type { InsightOptions, ReportData } from './types'

export const SDK_VERSION = '0.1.0'

/**
 * W1 临时消费者：把捕获到的数据打到控制台
 * W2 起替换为上报队列（批量 + sendBeacon + 失败重发）
 */
function debugConsumer(data: ReportData): void {
  console.info('[insight-sdk] 错误数据就绪（W2 起进入上报队列）:', data)
}

export function init(options: InsightOptions): void {
  if (!options.projectId || !options.reportUrl) {
    console.error('[insight-sdk] init 缺少必填参数: projectId / reportUrl')
    return
  }
  setOptions(options)
  startErrorCapture(debugConsumer)
  console.info(`[insight-sdk] v${SDK_VERSION} 初始化完成`, options.projectId)
}

// 工具函数导出，便于按需使用与测试
export { cyrb53 } from './utils/hash'
export { collectDeviceInfo } from './utils/device'
export { getVisitorId } from './utils/uuid'
export { injectVueErrorHandler } from './core/error'
