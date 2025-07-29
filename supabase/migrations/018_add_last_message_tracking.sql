-- Add last_message_at column to conversations table
ALTER TABLE conversations 
ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;

-- Create function to update last_message_at when messages are sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation's last_message_at timestamp
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation messages
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION update_conversation_last_message();

-- Initialize last_message_at for existing conversations
UPDATE conversations 
SET last_message_at = (
  SELECT MAX(created_at)
  FROM messages 
  WHERE messages.conversation_id = conversations.id
); 