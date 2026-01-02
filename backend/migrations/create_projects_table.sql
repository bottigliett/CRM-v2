-- Migration: Create projects table for MySQL
-- Date: 2026-01-02
-- Description: Adds project tracking functionality for budget and profitability analysis

CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `contact_id` INT NOT NULL,
  `budget` DECIMAL(10,2) NOT NULL,
  `estimated_hours` DECIMAL(10,2),
  `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  `start_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` INT NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_contact_id` (`contact_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`),

  CONSTRAINT `fk_projects_contact`
    FOREIGN KEY (`contact_id`)
    REFERENCES `contacts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_projects_creator`
    FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
