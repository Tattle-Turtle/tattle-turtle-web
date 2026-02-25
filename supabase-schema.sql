-- Supabase Database Schema for Shelly the Safety Turtle
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
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

-- Child Profile Table
CREATE TABLE IF NOT EXISTS child_profile (
  id BIGSERIAL PRIMARY KEY,
  parent_contact TEXT,
  child_name TEXT,
  child_age INTEGER,
  character_name TEXT DEFAULT 'Shelly',
  character_type TEXT DEFAULT 'Turtle',
  color TEXT DEFAULT 'Emerald',
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  image_data TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_child_requests_status ON child_requests(status);
CREATE INDEX IF NOT EXISTS idx_parent_reports_timestamp ON parent_reports(timestamp DESC);

-- Sample comment for future multi-user support
COMMENT ON TABLE child_profile IS 'Currently supports single profile. Will be extended with user_id for multi-user support.';
