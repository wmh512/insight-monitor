# Changelog

本项目所有重要变更的记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [未发布]

### 新增
- viewer 只读演示账号、授权项目隔离、到期撤销与虚构脱敏演示数据脚本（2026-11-01）
- 管理后台页面登录、会话保持、路由守卫与退出登录；不再使用浏览器原生 Basic Auth 弹窗（2026-11-01）
- 后台请求失败、空数据及 issue 状态更新的用户反馈与防重复提交（2026-11-01）
- 管理查询与 issue 状态接口的 HTTP Basic Auth；管理员凭证与 SDK 上报 token 分离，未配置时默认拒绝访问（2026-11-01）
- 服务端鉴权单元测试与真实路由集成测试（2026-11-01）
- 上报请求体大小、批量条数、字段类型、CORS 白名单与项目/IP 滑动窗口限流（2026-11-01）
- 服务端请求安全集成测试，覆盖 200 / 400 / 403 / 413 / 429 响应（2026-11-01）
- SDK 传输层单元测试，覆盖服务端确认、HTTP 失败、业务失败与 sendBeacon 路径（2026-11-01）

### 修复
- 已登录用户重复进入登录页时展示当前账号与切换入口，不再误报“登录已失效”（2026-11-01）
- 管理端 API 地址改为环境变量注入，生产构建默认使用同源 `/api`（2026-11-01）
- SDK fetch 上报仅在 HTTP 成功且业务 `code=0` 时确认成功，服务端拒绝的数据进入暂存重试（2026-11-01）
- SDK Demo 统一从 `demo/config.js` 读取上报配置，不再硬编码云服务器 IP（2026-11-01）
- SDK 资源错误捕获的 DOM 类型收窄，恢复 `pnpm sdk:typecheck`（2026-11-01）

### 新增（此前）
- 错误捕获模块：JS / Promise / 资源三类错误捕获 + 指纹去重（W1，2026-10-18）
- 性能采集模块：FP / FCP / LCP 采集，buffered 补收 + 页面隐藏时上报（W1，2026-10-19）
- 上报队列：批量 flush、localStorage 失败重发、采样率（W2，2026-10-22）
- 传输层：sendBeacon 优先 + fetch 兜底（W2，2026-10-22）

## [0.1.0] - 2026-10-18

### 新增
- 项目立项：pnpm monorepo 骨架（sdk / server / admin）
- 数据协议定稿：`packages/sdk/src/types.ts`（前后端契约）
- 数据库设计：`docs/schema.sql`（project / error_report / perf_report 三表）
- 工程规范：TypeScript strict、ESLint、Prettier、Conventional Commits、Vitest
- 文档体系：PRD、架构设计、性能基准、问题日志、开发日报
