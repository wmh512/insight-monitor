-- 求职展示专用项目：只包含虚构、脱敏的数据，不使用真实用户页面或堆栈。
-- 先在服务器核对 project_key 未被占用，再执行本脚本；不要把真实项目改为 viewer 项目。

USE insight_monitor;

INSERT INTO project (project_key, name)
SELECT 'interview_demo_project', '求职展示 · 虚构商店'
WHERE NOT EXISTS (SELECT 1 FROM project WHERE project_key = 'interview_demo_project');

INSERT INTO error_report (project_id, fingerprint, kind, message, stack, page_url, ua)
SELECT p.id, 'demo_js_checkout', 'js',
  '演示：结算按钮读取了未初始化的价格对象',
  'TypeError: Demo checkout price is not ready\n    at DemoCheckout (demo-app.js:42:15)',
  'https://demo.invalid/checkout', 'Insight Interview Demo / sanitized'
FROM project p
WHERE p.project_key = 'interview_demo_project'
  AND NOT EXISTS (SELECT 1 FROM error_report e WHERE e.project_id = p.id AND e.fingerprint = 'demo_js_checkout');

INSERT INTO error_report (project_id, fingerprint, kind, message, stack, page_url, ua)
SELECT p.id, 'demo_promise_cart', 'promise',
  '演示：购物车保存请求未处理失败',
  'Error: Demo cart service unavailable\n    at saveCart (demo-app.js:88:9)',
  'https://demo.invalid/cart', 'Insight Interview Demo / sanitized'
FROM project p
WHERE p.project_key = 'interview_demo_project'
  AND NOT EXISTS (SELECT 1 FROM error_report e WHERE e.project_id = p.id AND e.fingerprint = 'demo_promise_cart');

INSERT INTO issue (fingerprint, project_id, kind, message, last_page_url, seen_count)
SELECT e.fingerprint, e.project_id, e.kind, e.message, e.page_url, 1
FROM error_report e
JOIN project p ON p.id = e.project_id
WHERE p.project_key = 'interview_demo_project'
  AND NOT EXISTS (SELECT 1 FROM issue i WHERE i.fingerprint = e.fingerprint);

INSERT INTO perf_report (project_id, fp, fcp, lcp, page_url, ua)
SELECT p.id, 180, 520, 1080, 'https://demo.invalid/catalog', 'Insight Interview Demo / sanitized'
FROM project p
WHERE p.project_key = 'interview_demo_project'
  AND NOT EXISTS (SELECT 1 FROM perf_report r WHERE r.project_id = p.id AND r.page_url = 'https://demo.invalid/catalog');
