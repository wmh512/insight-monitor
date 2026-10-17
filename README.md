# Insight Monitor · 前端监控与性能分析平台

> 轻量、私有部署的前端错误监控与性能分析平台（自研学习版 Sentry）

| 项目信息 | |
|---|---|
| 开工日期 | 2026-10-18 |
| 计划完工 | 2027-01-17 |
| 作者 | wmh512 |
| 用途 | 2027 春招主攻项目 / 个人项目真实监控 |

## 这是什么

一个从零自研的前端监控平台，由三部分组成：

1. **insight-sdk**：零依赖 TypeScript SDK，采集 JS / Promise / 资源三类错误与 FP / FCP / LCP 性能指标，支持批量上报、失败重发
2. **server**：Node.js（Koa2）服务端，负责上报接收、数据聚合、SourceMap 还原
3. **admin**：Vue3 + TypeScript 管理后台，提供错误列表 / 详情、性能看板

## 仓库结构

```
insight-monitor/
├── packages/
│   ├── sdk/          # 监控 SDK（原生 TS，零运行时依赖）
│   ├── server/       # Koa2 服务端（W4 开工）
│   └── admin/        # Vue3 管理后台（W6 开工）
├── docs/             # 项目文档（PRD / 架构 / 数据库 / 基准 / 问题日志）
├── eslint.config.mjs
├── .prettierrc.json
└── pnpm-workspace.yaml
```

## 里程碑

- [x] **Phase 0 立项**：架构文档、数据协议、表结构、工程规范（2026-10-18）
- [ ] Phase 1 SDK 核心：错误捕获 / 性能采集 / 上报队列（W1-W3）
- [ ] Phase 2 服务端：Koa2 + MySQL + 聚合查询 + JWT（W4-W5）
- [ ] Phase 3 管理后台：Vue3 + TS + ECharts（W6-W8）
- [ ] Phase 4 真实数据与线上部署（W9-W10）
- [ ] Phase 5 沉淀与面试准备（W11-W12）

## 文档索引

| 文档 | 内容 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 需求文档：功能清单、非功能指标、验收标准 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构设计与模块职责 |
| [docs/schema.sql](docs/schema.sql) | 数据库表结构 |
| [docs/BENCHMARK.md](docs/BENCHMARK.md) | 性能基准记录（简历数字的唯一来源） |
| [docs/问题日志.md](docs/问题日志.md) | 问题排查记录（面试故事的唯一来源） |

## Git 提交规范

Conventional Commits：`feat` / `fix` / `perf` / `docs` / `refactor` / `test` / `chore`

示例：`feat(sdk): 支持 Promise 未处理拒绝捕获`

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm sdk:dev          # SDK 监听模式构建
pnpm sdk:build        # SDK 生产构建
pnpm sdk:test         # SDK 单元测试
pnpm lint             # ESLint 检查
pnpm format           # Prettier 格式化
```
