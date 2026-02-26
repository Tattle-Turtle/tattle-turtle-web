-- Supabase Database Schema for Shelly the Safety Turtle
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table (app roles; required for auth - server looks up/creates on first sign-in)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'school', 'parent', 'child')),
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Child Profile Table (must exist before messages for child_id FK)
CREATE TABLE IF NOT EXISTS child_profile (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_contact TEXT,
  child_name TEXT,
  child_age INTEGER,
  character_name TEXT DEFAULT 'Shelly',
  character_type TEXT DEFAULT 'Turtle',
  color TEXT DEFAULT 'Emerald',
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  image_data TEXT,
  access_code TEXT,
  access_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table (child_id links messages to a child for multi-child support)
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT REFERENCES child_profile(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('user', 'model', 'system')),
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT,
  icon TEXT,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Child Requests Table
CREATE TABLE IF NOT EXISTS child_requests (
  id BIGSERIAL PRIMARY KEY,
  child_id INTEGER,
  request_type TEXT,
  request_text TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Parent Reports Table
CREATE TABLE IF NOT EXISTS parent_reports (
  id BIGSERIAL PRIMARY KEY,
  summary TEXT,
  suggestions JSONB,
  safety_status TEXT,
  book_recommendations JSONB,
  growth_moments JSONB,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Memory Table (for AI context)
CREATE TABLE IF NOT EXISTS memory (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Parent Alerts (audit when Tier 3 escalation sends SMS)
CREATE TABLE IF NOT EXISTS parent_alerts (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 3,
  severity TEXT,
  message_sent TEXT,
  parent_contact_masked TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_alerts_child_id ON parent_alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_alerts_created_at ON parent_alerts(created_at DESC);

-- Missions (persisted from Talk to Tammy conversations; shown in Feed Tammy)
CREATE TABLE IF NOT EXISTS missions (
  id BIGSERIAL PRIMARY KEY,
  child_id BIGINT NOT NULL REFERENCES child_profile(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'stretch')),
  points INTEGER DEFAULT 20,
  steps JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  shared_with_parent_at TIMESTAMPTZ,
  source TEXT DEFAULT 'call',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_missions_child_id ON missions(child_id);
CREATE INDEX IF NOT EXISTS idx_missions_child_completed_created ON missions(child_id, completed, created_at DESC);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_child_id ON messages(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_child_requests_status ON child_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_reports_timestamp ON parent_reports(timestamp DESC);

-- Sample comment for future multi-user support
COMMENT ON TABLE child_profile IS 'Currently supports single profile. Will be extended with user_id for multi-user support.';
