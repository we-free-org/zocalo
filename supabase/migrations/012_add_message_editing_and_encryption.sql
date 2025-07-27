-- =============================================
-- ADD MESSAGE EDITING AND ENCRYPTION SUPPORT
-- =============================================

-- Add columns to messages table for editing and encryption
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS encryption_type TEXT DEFAULT 'none' CHECK (encryption_type IN ('none', 'instance_key', 'e2ee'));

-- Create index for encryption type for performance
CREATE INDEX IF NOT EXISTS idx_messages_encryption_type ON messages(encryption_type);

-- Add the encrypt_messages setting if it doesn't exist
INSERT INTO settings (key, value, scope, is_public, created_by)
SELECT 'encrypt_messages', '"instance_key"', 'global', false, '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (
    SELECT 1 FROM settings WHERE key = 'encrypt_messages' AND scope = 'global'
);

-- Update trigger to handle updated_at for messages
CREATE OR REPLACE FUNCTION update_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for messages updated_at
DROP TRIGGER IF EXISTS trigger_update_message_updated_at ON messages;
CREATE TRIGGER trigger_update_message_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_updated_at(); 