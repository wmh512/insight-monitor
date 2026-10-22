import { setOptions } from './config'
import { startErrorCapture } from './core/error'
import { startPerformanceCapture } from './core/performance'
import { add, startQueue } from './report/queue'
import { debugLog } from './utils/safe'
import type { InsightOptions, ReportData } from './types'

export const SDK_VERSION = '0.1.0'

/**
 * 采集数据的统一消费者：入队
 * W1 的“打日志”消费者已退休——现在数据真正流向上报链路：
 * 采集模块 → 队列 → 传输层 → 服务端
 */
function consumer(data: ReportData): void {
  debugLog(`${data.type === 'error' ? '错误' : '性能'}数据入队:`, data)
  add(data)
}

export function init(options: InsightOptions): void {
  if (!options.projectId || !options.reportUrl) {
    console.error('[insight-sdk] init 缺少必填参数: projectId / reportUrl')
    return
  }
  setOptions(options)
  startQueue() // 先启动队列（含暂存补发），再开始采集
  startErrorCapture(consumer)
  startPerformanceCapture(consumer)
  console.info(`[insight-sdk] v${SDK_VERSION} 初始化完成`, options.projectId)
}

// 工具函数导出，便于按需使用与测试
export { cyrb53 } from './utils/hash'
export { collectDeviceInfo } from './utils/device'
export { getVisitorId } from './utils/uuid'
export { injectVueErrorHandler } from './core/error'
