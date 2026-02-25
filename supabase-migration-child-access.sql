-- Child access code and control (run after main schema)
-- Adds parent-controlled login code and access toggle per child.

ALTER TABLE child_profile
  ADD COLUMN IF NOT EXISTS access_code TEXT,
  ADD COLUMN IF NOT EXISTS access_allowed BOOLEAN DEFAULT true;

COMMENT ON COLUMN child_profile.access_code IS '4-6 digit code for child to log in (parent sets/changes)';
COMMENT ON COLUMN child_profile.access_allowed IS 'Parent can turn off to deny child access';
