CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category ENUM('auth', 'operation') NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  actor_username VARCHAR(128) NOT NULL DEFAULT '',
  result ENUM('success', 'failure') NOT NULL,
  failure_reason VARCHAR(64) NOT NULL DEFAULT '',
  ip VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  target_type VARCHAR(64) NULL,
  target_id VARCHAR(128) NULL,
  change_summary JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_audit_category_created (category, created_at, id),
  INDEX idx_audit_actor_created (actor_username, created_at),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
