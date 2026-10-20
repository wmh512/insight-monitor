# 性能基准记录（BENCHMARK）

> 规则：每次涉及体积 / 速度 / 成功率的优化，必须记录前后对比。
> **简历和面试中出现的每一个数字，都必须能在本表找到出处。**

## 1. 实测记录

| 日期 | 指标 | 优化前 | 优化后 | 手段 | 关联 commit |
|---|---|---|---|---|---|
| 2026-10-19 | SDK gzip 体积 | 无产物（W1 前） | 2.57 kB（仅错误模块） | 零运行时依赖 + Vite lib 模式 + esbuild 压缩 | feat(sdk): W1 错误捕获 |
| 2026-10-19 | SDK gzip 体积 | 2.57 kB | 3.03 kB（错误+性能） | 新增 performance 模块（+0.46 kB，符合预期） | feat(sdk): 性能采集 |

## 2. 计划采集的指标

| 指标 | 目标 | 采集方式 |
|---|---|---|
| SDK gzip 体积 | < 8KB | `vite build` 后对产物执行 gzip 实测 |
| 卸载场景上报成功率 | ≥ 95% | 制造 100 次页面关闭，统计服务端收到条数 |
| 错误列表首屏（万级数据） | < 300ms | Chrome Performance 面板录制 |
| GET /api/errors P95 | < 200ms | Postman Runner 跑 100 次取 P95 |
| 上报请求压缩率 | ≥ 80% | 批量上报前后请求数对比 |
| 错误去重收敛率 | 记录即可 | 上报 500 条真实错误，统计收敛为多少个 issue |

## 3. 测量方法备忘

```bash
# gzip 体积（在 packages/sdk 下执行）
gzip -c dist/insight.es.js | wc -c

# Windows PowerShell 等价命令
(Get-Item dist/insight.es.js | ForEach-Object {
  $in = [IO.File]::OpenRead($_.FullName)
  $out = [IO.MemoryStream]::new()
  $gz = [IO.Compression.GzipStream]::new($out, [IO.Compression.CompressionMode]::Compress)
  $in.CopyTo($gz); $gz.Dispose()
  $out.ToArray().Length
})
```
