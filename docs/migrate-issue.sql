-- ============================================================
-- W9-d 迁移脚本：issue 生命周期表
-- 用法：在已有库上执行一次（新建库直接跑 schema.sql 即可）
--   mysql -u root -p insight_monitor < docs/migrate-issue.sql
-- ============================================================

USE insight_monitor;

-- 1. 建表（已存在则跳过）
CREATE TABLE IF NOT EXISTS `issue` (
  `fingerprint`      VARCHAR(64)  NOT NULL COMMENT '错误指纹（= issue 身份）',
  `project_id`       INT UNSIGNED NOT NULL,
  `kind`             ENUM('js','promise','resource') NOT NULL,
  `message`          VARCHAR(500) NOT NULL,
  `last_page_url`    VARCHAR(500) NULL COMMENT '最近一次出现的页面',
  `status`           VARCHAR(16)  NOT NULL DEFAULT 'unseen' COMMENT 'unseen | seen | resolved',
  `seen_count`       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计出现次数',
  `notify_count`     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计通知次数',
  `first_seen`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_notified_at` DATETIME     NULL COMMENT '上次推送时间（冷却窗口依据）',
  `resolved_at`      DATETIME     NULL COMMENT '标记为已解决的时间',
  PRIMARY KEY (`fingerprint`),
  KEY `idx_status` (`status`),
  KEY `idx_last_seen` (`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误 issue 生命周期';

-- 2. 存量回填：从已有的 error_report 聚合出历史 issue
--    status 置为 'seen'（已出现过、但没被标记处理过）
--    last_notified_at 留空 → 下次再出现时按"超过冷却窗口"处理
--    用 INSERT IGNORE 保证幂等：迁移脚本必须能重复执行（第二次跑不报错、只补缺失的）
INSERT IGNORE INTO `issue`
  (`fingerprint`, `project_id`, `kind`, `message`, `last_page_url`,
   `status`, `seen_count`, `first_seen`, `last_seen`)
SELECT
  e.fingerprint,
  MAX(e.project_id),
  MAX(e.kind),
  LEFT(MAX(e.message), 500),
  MAX(e.page_url),
  'seen',
  COUNT(*),
  MIN(e.created_at),
  MAX(e.created_at)
FROM `error_report` e
GROUP BY e.fingerprint;

-- 3. 验证：应能看到历史 issue 及其出现次数
-- SELECT fingerprint, kind, status, seen_count, first_seen, last_seen FROM issue ORDER BY last_seen DESC LIMIT 10;
