# Changelog

本项目所有重要变更的记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [未发布]

### 新增
- SDK 传输层单元测试，覆盖服务端确认、HTTP 失败、业务失败与 sendBeacon 路径（2026-11-01）

### 修复
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
