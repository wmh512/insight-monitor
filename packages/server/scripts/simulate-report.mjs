/**
 * 模拟 SDK 的一次批量上报（W4-02 基准测试 + 手动验证工具）
 * 运行：node scripts/simulate-report.mjs（需要服务端已启动）
 */
const REPORT_URL = 'http://localhost:3000/api/report'
const BATCH_SIZE = 20

function makeError(i) {
  return {
    type: 'error',
    projectId: 'demo_project_key_001',
    pageUrl: `http://localhost:5173/bench/page-${i}`,
    timestamp: Date.now(),
    visitorId: 'bench-visitor-001',
    device: { ua: 'bench-ua', screen: '1920x1080', lang: 'zh-CN', timezone: 'Asia/Shanghai' },
    error: {
      kind: 'js',
      message: `bench error ${i}`,
      stack: `Error: bench error ${i}\n    at benchFn (bench.js:${i}:1)`,
      fingerprint: `bench_fp_${Date.now()}_${i}`,
    },
  }
}

function makePerformance(i) {
  return {
    type: 'performance',
    projectId: 'demo_project_key_001',
    pageUrl: `http://localhost:5173/bench/page-${i}`,
    timestamp: Date.now(),
    visitorId: 'bench-visitor-001',
    device: { ua: 'bench-ua', screen: '1920x1080', lang: 'zh-CN', timezone: 'Asia/Shanghai' },
    perf: { FP: 100 + i, FCP: 200 + i, LCP: 300 + i },
  }
}

// 组装 20 条混合数据（10 error + 10 performance）
const batch = []
for (let i = 0; i < BATCH_SIZE / 2; i++) {
  batch.push(makeError(i))
  batch.push(makePerformance(i))
}

const start = performance.now()
const res = await fetch(REPORT_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify(batch),
})
const data = await res.json()
const ms = (performance.now() - start).toFixed(1)

console.log(`发送 ${batch.length} 条 → 响应 ${res.status}`, data, `耗时 ${ms}ms`)
