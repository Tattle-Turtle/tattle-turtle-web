-- Migration: align existing DB with application (run if you already applied supabase-schema.sql earlier)
-- Run this in Supabase SQL Editor when: children are not being added, or sign-in fails with missing table/column.

-- 1. Profiles table (required for sign-in; server creates row on first auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'school', 'parent', 'child')),
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. child_id on messages (app uses it for all message inserts/selects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'child_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN child_id BIGINT;
    CREATE INDEX IF NOT EXISTS idx_messages_child_id ON messages(child_id);
  END IF;
END $$;

-- 3. child_profile access columns (required for adding children)
ALTER TABLE child_profile
  ADD COLUMN IF NOT EXISTS access_code TEXT,
  ADD COLUMN IF NOT EXISTS access_allowed BOOLEAN DEFAULT true;
