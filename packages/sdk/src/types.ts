/**
 * Insight SDK 数据协议（定稿版 v0.1）
 *
 * 本文件是前后端契约：
 * - 任何字段变更必须同步 server / admin 两端
 * - 提交信息中必须标注 protocol 变更
 * - 本文件零运行时依赖，保持纯类型定义
 */

/** SDK 初始化配置 */
export interface InsightOptions {
  /** 项目标识，由管理后台创建项目时生成 */
  projectId: string
  /** 上报地址，如 https://your-domain.com/api/report */
  reportUrl: string
  /** 单次批量上报最大条数，默认 20 */
  maxQueueSize?: number
  /** 队列 flush 间隔（毫秒），默认 5000 */
  flushInterval?: number
  /** 性能指标采样率 0-1，默认 1（W3 实现） */
  perfSampleRate?: number
  /** 是否开启调试日志，默认 false */
  debug?: boolean
}

/** 设备与环境信息 */
export interface DeviceInfo {
  /** User-Agent */
  ua: string
  /** 屏幕分辨率，如 1920x1080 */
  screen: string
  /** 页面语言，如 zh-CN */
  lang: string
  /** 时区，如 Asia/Shanghai */
  timezone: string
}

/** 错误类型：js 运行时错误 / Promise 未处理拒绝 / 资源加载失败 */
export type ErrorKind = 'js' | 'promise' | 'resource'

/** 错误详情 */
export interface ErrorInfo {
  kind: ErrorKind
  message: string
  /** 完整堆栈（压缩环境为压缩后堆栈，P1 配合 SourceMap 还原） */
  stack: string
  /** 错误指纹，用于服务端聚合去重 */
  fingerprint: string
  /** 资源加载失败时的资源地址（kind 为 resource 时必有） */
  resourceUrl?: string
}

/** 性能指标（单位：毫秒） */
export interface PerfMetrics {
  /** First Paint 首次绘制 */
  FP: number
  /** First Contentful Paint 首次内容绘制 */
  FCP: number
  /** Largest Contentful Paint 最大内容绘制 */
  LCP: number
}

/** 单条上报数据 */
export interface ReportData {
  type: 'error' | 'performance'
  projectId: string
  /** 页面完整 URL */
  pageUrl: string
  /** 上报时间戳（毫秒） */
  timestamp: number
  /** 访客唯一标识（localStorage 持久化） */
  visitorId: string
  device: DeviceInfo
  error?: ErrorInfo
  perf?: PerfMetrics
}

/** 上报传输方式 */
export type TransportType = 'beacon' | 'fetch'
