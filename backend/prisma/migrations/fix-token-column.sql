-- Migration: Fix token column size limitation
-- This migration changes the token column from VARCHAR(191) to TEXT
-- and adds a token_hash column for fast, secure lookups

-- Step 1: Drop the UNIQUE constraint on token column
ALTER TABLE user_sessions DROP INDEX user_sessions_token_key;

-- Step 2: Change token column to TEXT (unlimited size)
ALTER TABLE user_sessions MODIFY COLUMN token TEXT;

-- Step 3: Add token_hash column as VARCHAR(64) for SHA-256 hash
ALTER TABLE user_sessions ADD COLUMN token_hash VARCHAR(64) NULL;

-- Step 4: Create UNIQUE index on token_hash
ALTER TABLE user_sessions ADD UNIQUE INDEX user_sessions_token_hash_key (token_hash);
