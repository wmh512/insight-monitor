-- ============================================================
-- Insight Monitor 数据库结构
-- MySQL 8.0+ ｜ 引擎 InnoDB ｜ 字符集 utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS insight_monitor
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE insight_monitor;

-- ------------------------------------------------------------
-- 1. 项目表（SDK 接入凭证）
-- ------------------------------------------------------------
CREATE TABLE `project` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_key` VARCHAR(64)  NOT NULL COMMENT 'SDK 接入密钥，创建项目时生成',
  `name`        VARCHAR(100) NOT NULL COMMENT '项目名称',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_project_key` (`project_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='被监控项目';

-- ------------------------------------------------------------
-- 2. 错误明细表（高频写入，索引见 idx_project_time / idx_fingerprint）
-- ------------------------------------------------------------
CREATE TABLE `error_report` (
  `id`          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id`  INT UNSIGNED NOT NULL,
  `fingerprint` VARCHAR(64)  NOT NULL COMMENT '错误指纹（cyrb53）',
  `kind`        ENUM('js','promise','resource') NOT NULL COMMENT '错误类型',
  `message`     TEXT         NOT NULL,
  `stack`       MEDIUMTEXT   NULL COMMENT '错误堆栈（压缩环境为压缩后堆栈）',
  `page_url`    VARCHAR(500) NOT NULL,
  `ua`          VARCHAR(500) NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_project_time` (`project_id`, `created_at`),
  KEY `idx_fingerprint` (`fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误上报明细';

-- ------------------------------------------------------------
-- 3. issue 表（错误指纹的生命周期状态机，W9-d）
--    指纹即 issue 身份：同一指纹 = 同一个 issue
--    status: unseen(新) → seen(处理中) → resolved(我标记已解决)
--    resolved 的 issue 再次出现 → 自动复活为 unseen 并推送"复发告警"
-- ------------------------------------------------------------
CREATE TABLE `issue` (
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

-- ------------------------------------------------------------
-- 4. 性能报表
-- ------------------------------------------------------------
CREATE TABLE `perf_report` (
  `id`         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT UNSIGNED NOT NULL,
  `fp`         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'First Paint (ms)',
  `fcp`        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'First Contentful Paint (ms)',
  `lcp`        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Largest Contentful Paint (ms)',
  `page_url`   VARCHAR(500) NOT NULL,
  `ua`         VARCHAR(500) NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_project_time` (`project_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='性能指标明细';

-- ------------------------------------------------------------
-- 测试数据（W3 联调用，上线前删除）
-- ------------------------------------------------------------
INSERT INTO `project` (`project_key`, `name`) VALUES
('demo_project_key_001', '本地演示项目');

-- ------------------------------------------------------------
-- 核心聚合查询（后台错误列表）
-- ------------------------------------------------------------
-- SELECT fingerprint, kind, message, COUNT(*) AS count,
--        MAX(created_at) AS last_seen, MIN(created_at) AS first_seen
-- FROM error_report
-- WHERE project_id = ?
-- GROUP BY fingerprint
-- ORDER BY last_seen DESC
-- LIMIT ?, ?;
