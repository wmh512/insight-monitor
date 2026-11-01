import assert from 'node:assert/strict'
import { test } from 'node:test'
import app from '../src/app.js'
import config from '../src/config.js'
import { pool } from '../src/db/pool.js'
import { resetRateLimits } from '../src/middlewares/rateLimit.js'

function validError() {
  return {
    type: 'error',
    projectId: 'demo_project_key_001',
    pageUrl: 'http://localhost/demo/',
    timestamp: Date.now(),
    visitorId: 'test-visitor',
    device: { ua: 'test-agent' },
    error: { kind: 'js', message: 'test error', stack: '', fingerprint: 'fp-test' },
  }
}

async function request(server, { body, origin, method = 'POST' }) {
  return fetch(`http://127.0.0.1:${server.address().port}/api/report`, {
    method,
    headers: { 'Content-Type': 'text/plain', ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  })
}

function useTestServer(t) {
  const originalToken = config.reportToken
  const originalOrigins = config.corsOrigins
  const originalExecute = pool.execute
  const originalRateLimit = config.reportRateLimit
  config.reportToken = 'test-only-token'
  config.corsOrigins = ['http://allowed.test']
  resetRateLimits()
  let databaseCalls = 0
  pool.execute = async () => {
    databaseCalls += 1
    return [[{ id: 1 }]]
  }
  t.after(() => {
    config.reportToken = originalToken
    config.corsOrigins = originalOrigins
    pool.execute = originalExecute
    config.reportRateLimit = originalRateLimit
    resetRateLimits()
  })
  const server = app.listen(0)
  t.after(() => server.close())
  return { server, databaseCalls: () => databaseCalls }
}

test('合法上报保持可用，并返回服务端确认 code=0', async (t) => {
  const { server } = useTestServer(t)
  const response = await request(server, {
    body: { token: 'test-only-token', data: [validError()] },
  })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).code, 0)
})

test('超大请求体返回 413，不访问数据库', async (t) => {
  const { server, databaseCalls } = useTestServer(t)
  const report = validError()
  report.error.stack = 'x'.repeat(70000)
  const response = await request(server, { body: { token: 'test-only-token', data: [report] } })
  assert.equal(response.status, 413)
  assert.equal(databaseCalls(), 0)
})

test('缺少 error、混用 projectId、非法指标均被 400 拒绝且不查库', async (t) => {
  const { server, databaseCalls } = useTestServer(t)
  const invalidBatches = [
    [{ ...validError(), error: null }],
    [validError(), { ...validError(), projectId: 'another-project' }],
    [
      {
        type: 'performance',
        projectId: 'demo_project_key_001',
        pageUrl: 'http://localhost/',
        timestamp: Date.now(),
        device: {},
        perf: { FP: -1, FCP: 1, LCP: 1 },
      },
    ],
  ]
  for (const data of invalidBatches) {
    const response = await request(server, { body: { token: 'test-only-token', data } })
    assert.equal(response.status, 400)
  }
  assert.equal(databaseCalls(), 0)
})

test('CORS 仅允许白名单 Origin，未配置来源的预检返回 403', async (t) => {
  const { server } = useTestServer(t)
  const allowed = await request(server, {
    body: {},
    origin: 'http://allowed.test',
    method: 'OPTIONS',
  })
  assert.equal(allowed.status, 204)
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://allowed.test')

  const denied = await request(server, {
    body: {},
    origin: 'http://denied.test',
    method: 'OPTIONS',
  })
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
})

test('同项目同 IP 超过限流阈值返回 429，且不再写库', async (t) => {
  const { server, databaseCalls } = useTestServer(t)
  config.reportRateLimit = 2
  const body = { token: 'test-only-token', data: [validError()] }
  for (let i = 0; i < 2; i += 1) {
    const response = await request(server, { body })
    assert.equal(response.status, 200)
  }
  const before = databaseCalls()
  const limited = await request(server, { body })
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('retry-after'), '60')
  assert.equal(databaseCalls(), before)
})
