# 架构设计 · Insight Monitor

> 版本 v0.1 ｜ 2026-10-18 ｜ 配图待 W1 用 draw.io 绘制后导出至 docs/images/

## 1. 系统全景

```
┌──────────────────────────────────────────────────────────────┐
│                        浏览器（被测页面）                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │ 业务代码     │ → │  insight-sdk     │ → │ 上报队列       │  │
│  │ (Vue/原生)   │   │ 错误/性能采集     │   │ 批量+sendBeacon│  │
│  └─────────────┘   └──────────────────┘   └───────┬───────┘  │
└──────────────────────────────────────────────────┼──────────┘
                                                   │ HTTPS POST
┌──────────────────────────────────────────────────▼──────────┐
│                      服务端（Koa2）                          │
│  路由/参数校验 → Service → MySQL（明细）/ Redis（计数）        │
│  SourceMap 解析（P1） · JWT 鉴权（后台接口）                   │
└──────────────────────────────────────────────────┬──────────┘
                                                   │
┌──────────────────────────────────────────────────▼──────────┐
│                   管理后台（Vue3 + TS）                       │
│   登录 · 项目 · 错误聚合列表 · 错误详情 · 性能看板              │
└─────────────────────────────────────────────────────────────┘
```

## 2. 模块职责

### 2.1 SDK（packages/sdk）

| 模块 | 职责 | 状态 |
|---|---|---|
| src/index.ts | 入口 init()，模块串联 | ✅ 已完成 |
| src/types.ts | 数据协议（契约） | ✅ 已定稿 |
| core/error.ts | 三类错误捕获 + 指纹 | ✅ 已完成 |
| core/performance.ts | FP/FCP/LCP 采集 | ✅ 已完成 |
| core/blank.ts | 白屏检测 | P2 |
| report/queue.ts | 上报队列（批量/失败重发/采样率） | ✅ 已完成 |
| report/transport.ts | sendBeacon / fetch 传输 | ✅ 已完成 |
| utils/hash.ts | cyrb53 指纹 | ✅ 已完成 |
| utils/device.ts | UA/屏幕/环境 | ✅ 已完成 |
| utils/uuid.ts | visitorId | ✅ 已完成 |
| utils/safe.ts | guard 保护 + debugLog | ✅ 已完成 |

### 2.2 服务端（packages/server）— W4 开工

| 模块 | 职责 |
|---|---|
| routes / controllers | HTTP 层，参数校验 |
| services | 上报入库、聚合查询、SourceMap 还原 |
| db | mysql2 连接池、Redis |
| middlewares | 错误统一处理、JWT、请求日志 |

### 2.3 后台（packages/admin）— W6 开工

| 模块 | 职责 |
|---|---|
| 登录/项目 | JWT 登录态、项目切换 |
| 错误模块 | 聚合列表（虚拟列表）、详情、堆栈展示 |
| 性能模块 | ECharts 趋势、分布 |
| 基建 | axios 封装、路由权限、构建优化 |

## 3. 关键数据流

### 3.1 错误上报链路（W1 补时序图）

1. 错误发生 → error.ts 捕获 → 组装 ReportData（含 fingerprint）
2. queue.add() 入队 → 达到 maxQueueSize 或 flushInterval 触发 flush
3. transport 优先 sendBeacon 批量发送 → 失败降级 fetch → 仍失败写 localStorage
4. 下次 init 时读取 localStorage 补发
5. 服务端校验 → 批量 insert → 后台按 fingerprint 聚合展示

### 3.2 错误聚合链路（W5 补）

GROUP BY fingerprint → 列表展示 count/last_seen → 点击按 fingerprint 查最近明细

## 4. 技术选型与理由

| 决策 | 选择 | 理由 |
|---|---|---|
| SDK 语言 | 原生 TS 零依赖 | 体积可控（<8KB）、可审计 |
| 打包 | Vite lib 模式 | 与现代工具链一致 |
| 上报 | sendBeacon 优先 | 页面卸载时可靠投递 |
| 去重 | cyrb53 指纹 | 零依赖、速度足够 |
| 服务端 | Koa2 | 轻量、中间件机制清晰 |
| 后台 | Vue3 + TS | 与前端主流技术栈一致 |
