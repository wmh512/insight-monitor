import type { InsightOptions } from './types'

export const SDK_VERSION = '0.1.0'

/**
 * SDK 入口（当前为 Phase 0 占位实现）
 *
 * W1 起依次接入：
 *  - core/error.ts        三类错误捕获
 *  - core/performance.ts  性能指标采集
 *  - report/              上报队列与传输
 */
export function init(options: InsightOptions): void {
  if (!options.projectId || !options.reportUrl) {
    console.error('[insight-sdk] init 缺少必填参数: projectId / reportUrl')
    return
  }
  console.info(`[insight-sdk] v${SDK_VERSION} 占位实现已加载`, options.projectId)
}
