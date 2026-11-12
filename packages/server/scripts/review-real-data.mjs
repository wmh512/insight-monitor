import { pool } from '../src/db/pool.js'

function pagePath(url) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return '[invalid URL]'
  }
}

function sensitiveUrl(url) {
  return /[?&](token|secret|password|key|code|openid|session)=/i.test(url)
}

function percentile(values, ratio) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)]
}

const [projects] = await pool.query(
  `SELECT p.id, p.name, COUNT(DISTINCT e.id) AS error_count, COUNT(DISTINCT f.id) AS perf_count
   FROM project p LEFT JOIN error_report e ON e.project_id = p.id
   LEFT JOIN perf_report f ON f.project_id = p.id GROUP BY p.id, p.name ORDER BY p.id`,
)
const [errors] = await pool.query(
  `SELECT p.name AS project, e.kind, e.message, e.page_url, e.created_at
   FROM error_report e JOIN project p ON p.id = e.project_id ORDER BY e.id DESC LIMIT 500`,
)
const [performance] = await pool.query(
  `SELECT p.name AS project, f.fp, f.fcp, f.lcp, f.page_url, f.created_at
   FROM perf_report f JOIN project p ON p.id = f.project_id ORDER BY f.id DESC LIMIT 500`,
)
const errorGroups = {}
const perfGroups = {}
for (const row of errors) {
  const key = `${row.project} | ${row.kind} | ${pagePath(row.page_url)}`
  const item = errorGroups[key] ??= { count: 0, lastSeen: row.created_at }
  item.count += 1
}
for (const row of performance) {
  const item = perfGroups[`${row.project} | ${pagePath(row.page_url)}`] ??= { count: 0, fp: [], fcp: [], lcp: [] }
  item.count += 1
  for (const field of ['fp', 'fcp', 'lcp']) if (row[field] > 0) item[field].push(row[field])
}
for (const item of Object.values(perfGroups)) {
  for (const field of ['fp', 'fcp', 'lcp']) item[`${field}P95`] = percentile(item[field], 0.95)
  for (const field of ['fp', 'fcp', 'lcp']) delete item[field]
}
const [latest] = await pool.query('SELECT COUNT(*) AS recent, (SELECT COUNT(*) FROM perf_report) AS total FROM (SELECT id FROM perf_report ORDER BY id DESC LIMIT 50) recent_perf')
console.log(JSON.stringify({
  scope: '最近各 500 条错误与性能记录；仅输出页面路径，不输出参数、堆栈、Token 或凭据',
  projects,
  errorsByTypeAndPage: errorGroups,
  performanceByPage: perfGroups,
  chartScope: latest[0],
  privacy: {
    sensitiveErrorUrls: errors.filter((row) => sensitiveUrl(row.page_url)).length,
    sensitivePerfUrls: performance.filter((row) => sensitiveUrl(row.page_url)).length,
  },
}, null, 2))
await pool.end()
