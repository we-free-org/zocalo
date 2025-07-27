-- =============================================
-- ADD MESSAGE STATUS SYSTEM AND IMPROVE MESSAGE MANAGEMENT
-- =============================================

-- Add status column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'deleted', 'pending_approval'));

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Add deleted_by and deleted_at columns for audit trail
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update the default encryption setting to ensure it's properly formatted as JSON
UPDATE settings 
SET value = '"instance_key"'::json 
WHERE key = 'encrypt_messages' 
AND scope = 'global';

-- Ensure encryption setting exists with proper JSON format
INSERT INTO settings (key, value, scope, is_public, created_by)
SELECT 'encrypt_messages', '"instance_key"'::json, 'global', false, '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (
    SELECT 1 FROM settings WHERE key = 'encrypt_messages' AND scope = 'global'
); 