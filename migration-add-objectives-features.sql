-- Migration: Add objectives and package features to quotes
-- Date: 2026-01-15
-- Description: Add support for project objectives and package feature lists

-- Add objectives field to quotes table
ALTER TABLE `quotes`
ADD COLUMN `objectives` TEXT NULL COMMENT 'JSON array of project objectives [{title, description}]' AFTER `description`;

-- Add features field to quote_packages table
ALTER TABLE `quote_packages`
ADD COLUMN `features` TEXT NULL COMMENT 'JSON array of package features ["Feature 1", "Feature 2"]' AFTER `description`;

-- Verify changes
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quotes'
  AND COLUMN_NAME = 'objectives';

SELECT
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'quote_packages'
  AND COLUMN_NAME = 'features';
