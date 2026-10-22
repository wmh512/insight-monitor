import type { ErrorInfo, ErrorKind, ReportData } from '../types'
import { getOptions } from '../config'
import { cyrb53 } from '../utils/hash'
import { collectDeviceInfo } from '../utils/device'
import { getVisitorId } from '../utils/uuid'
import { guard } from '../utils/safe'

/** 错误数据就绪回调（W2 起由上报队列消费） */
export type ErrorListener = (data: ReportData) => void

let listener: ErrorListener | null = null
let started = false

/**
 * 启动错误捕获（幂等：重复调用只生效一次）
 *
 * 覆盖三类错误：
 * 1. JS 运行时错误      —— window.onerror
 * 2. Promise 未处理拒绝  —— unhandledrejection 事件
 * 3. 资源加载失败        —— window 上 capture 阶段的 error 事件
 */
export function startErrorCapture(onError: ErrorListener): void {
  // SSR 保护：无 window 环境（Node 渲染）直接跳过
  if (started || typeof window === 'undefined') return
  started = true
  listener = onError

  // ---- 1. JS 运行时错误 ----
  window.onerror = (message, _source, _lineno, _colno, error) => {
    guard(() => {
      const normalized = normalizeError(error, String(message))
      emit('js', normalized.message, normalized.stack)
    })
    // 返回 false：不阻止浏览器默认行为，控制台仍可见原始错误
    return false
  }

  // ---- 2. Promise 未处理拒绝 ----
  window.addEventListener('unhandledrejection', (event) => {
    guard(() => {
      const reason = (event as PromiseRejectionEvent).reason
      const normalized = normalizeError(reason, String(reason))
      emit('promise', normalized.message, normalized.stack)
    })
  })

  // ---- 3. 资源加载失败 ----
  // 关键：资源错误不冒泡，必须用 capture 阶段在 window 上监听
  window.addEventListener(
    'error',
    (event) => {
      guard(() => {
        const target = event.target as HTMLElement | null
        // 未捕获异常也会派发 target 为 window 的 error 事件，交给 onerror 处理
        if (!target || target === window || !target.tagName) return
        const resourceUrl = getResourceUrl(target)
        emit('resource', `资源加载失败: ${resourceUrl || target.tagName}`, '', resourceUrl)
      })
    },
    true,
  )
}

/**
 * Vue3 错误处理注入（可选）
 *
 * 为什么需要：Vue 3 的渲染错误会被 errorHandler 拦截，
 * 不一定冒泡到 window.onerror；框架使用方应主动注入。
 * 这里用结构化类型而非 import vue，保持 SDK 零依赖。
 */
export function injectVueErrorHandler(app: {
  config: { errorHandler?: (err: unknown, instance: unknown, info: string) => void }
}): void {
  app.config.errorHandler = (err, _instance, info) => {
    guard(() => {
      const normalized = normalizeError(err, String(err))
      emit('js', `[Vue] ${info}: ${normalized.message}`, normalized.stack)
    })
  }
}

// ---------------- 内部实现 ----------------

function emit(kind: ErrorKind, message: string, stack: string, resourceUrl?: string): void {
  if (!listener) return
  const error: ErrorInfo = {
    kind,
    message: truncate(message, 500),
    stack: truncate(stack, 4000),
    fingerprint: cyrb53(buildFingerprintInput(message, stack)),
    ...(resourceUrl ? { resourceUrl: truncate(resourceUrl, 500) } : {}),
  }
  listener(buildReportData(error))
}

/**
 * 指纹输入 = message + 堆栈前 3 帧
 *
 * 为什么只取前 3 帧：
 * - 行号会随代码热修复漂移，取完整堆栈会让同一错误指纹不断变化，聚合失效
 * - 完全去掉堆栈又会让不同来源的同类 message 混为一个 issue
 * - 前 3 帧是稳定性与区分度的平衡点
 */
function buildFingerprintInput(message: string, stack: string): string {
  const frames = stack
    .split('\n')
    .slice(0, 3)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('|')
  return `${message}@${frames}`
}

/** 把任意错误值归一化为 { message, stack } */
function normalizeError(
  error: unknown,
  fallbackMessage: string,
): { message: string; stack: string } {
  if (error instanceof Error) {
    return { message: error.message || fallbackMessage, stack: error.stack ?? '' }
  }
  if (typeof error === 'string') {
    return { message: error, stack: '' }
  }
  if (error && typeof error === 'object') {
    const anyErr = error as { message?: unknown; stack?: unknown }
    return {
      message: String(anyErr.message ?? fallbackMessage),
      stack: typeof anyErr.stack === 'string' ? anyErr.stack : '',
    }
  }
  return { message: fallbackMessage, stack: '' }
}

function buildReportData(error: ErrorInfo): ReportData {
  const { projectId } = getOptions()
  return {
    type: 'error',
    projectId,
    pageUrl: typeof location !== 'undefined' ? location.href : '',
    timestamp: Date.now(),
    visitorId: getVisitorId(),
    device: collectDeviceInfo(),
    error,
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…[truncated]` : str
}

function getResourceUrl(el: HTMLElement): string {
  const anyEl = el as unknown as { src?: string; href?: string }
  return anyEl.src || anyEl.href || ''
}
