-- W5-01 Phase 2：查询 SQL 人肉验证
-- 纪律：SQL 先在客户端跑通，再搬进代码——这些就是明天接口的 SQL 原型
-- 用法（项目根目录）：
--   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p insight_monitor -e "source packages/server/scripts/explore-queries.sql"

-- 1. 错误列表（按指纹聚合 + 分页）——接口 1 的心脏
SELECT e.fingerprint,
       COUNT(*)          AS cnt,
       MAX(e.created_at) AS last_seen,
       e.kind,
       e.message
FROM error_report e
JOIN project p ON e.project_id = p.id
WHERE p.project_key = 'demo_project_key_001'
GROUP BY e.fingerprint, e.kind, e.message
ORDER BY last_seen DESC
LIMIT 20 OFFSET 0;

-- 2. 概览统计（总错误数 / 今日错误数）——接口 3 的一部分
SELECT COUNT(*)                              AS total_errors,
       SUM(e.created_at >= CURDATE())        AS today_errors
FROM error_report e
JOIN project p ON e.project_id = p.id
WHERE p.project_key = 'demo_project_key_001';

-- 3. 按类型分布（js / promise / resource 各多少）——接口 3 的一部分
SELECT e.kind, COUNT(*) AS cnt
FROM error_report e
JOIN project p ON e.project_id = p.id
WHERE p.project_key = 'demo_project_key_001'
GROUP BY e.kind;

-- 4. 某条详情（接口 2：按主键取单条完整信息）
SELECT id, kind, message, stack, page_url, ua, created_at
FROM error_report
WHERE id = 1;
