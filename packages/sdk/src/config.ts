import type { InsightOptions } from './types'

/**
 * 运行时配置存储
 *
 * 单独成模块的原因：core/* 各模块（error / performance / queue）都需要读取
 * projectId 等配置，但模块之间不应互相依赖，统一从 config 读取。
 */

const DEFAULTS = {
  maxQueueSize: 20,
  flushInterval: 5000,
  perfSampleRate: 1,
  debug: false,
}

type RuntimeOptions = typeof DEFAULTS & { projectId: string; reportUrl: string }

let options: RuntimeOptions | null = null

export function setOptions(input: InsightOptions): void {
  options = { ...DEFAULTS, ...input }
}

export function getOptions(): RuntimeOptions {
  if (!options) {
    throw new Error('[insight-sdk] 配置未初始化，请先调用 init()')
  }
  return options
}

export function isDebug(): boolean {
  return options?.debug ?? false
}
