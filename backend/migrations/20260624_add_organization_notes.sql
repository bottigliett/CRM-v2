-- Migration: Add organization_notes table
CREATE TABLE IF NOT EXISTS organization_notes (
  id             INT NOT NULL AUTO_INCREMENT,
  organization_id INT NOT NULL,
  user_id        INT NULL,
  content        TEXT NOT NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_org_notes_org_id (organization_id),
  CONSTRAINT fk_org_notes_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
