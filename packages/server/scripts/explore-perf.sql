-- W7-01 Phase 1：性能查询 SQL 人肉验证
-- 纪律：SQL 先在客户端跑通，再搬进代码——这些就是明天接口的 SQL 原型
-- 用法（项目根目录）：
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p insight_monitor -e "source packages/server/scripts/explore-perf.sql"

-- 1. 性能记录列表（最近 50 条，图表数据源）——接口 1 的心脏
SELECT e.id, e.fp, e.fcp, e.lcp, e.page_url, e.created_at
FROM perf_report e
JOIN project p ON e.project_id = p.id
WHERE p.project_key = 'demo_project_key_001'
ORDER BY e.created_at DESC
LIMIT 50;

-- 2. 性能均值（数字卡片数据源）——接口 2 的心脏
-- 注意：fp/fcp/lcp 可能为 NULL（指标未触发），AVG 会自动跳过 NULL
SELECT AVG(e.fp)   AS avg_fp,
       AVG(e.fcp)  AS avg_fcp,
       AVG(e.lcp)  AS avg_lcp,
       COUNT(*)    AS cnt
FROM perf_report e
JOIN project p ON e.project_id = p.id
WHERE p.project_key = 'demo_project_key_001';

-- 3. 看一眼 perf_report 里到底有多少数据（决定图表好不好看）
SELECT COUNT(*) AS total FROM perf_report;
