# Changelog

本项目所有重要变更的记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循语义化版本。

## [未发布]

### 新增
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
