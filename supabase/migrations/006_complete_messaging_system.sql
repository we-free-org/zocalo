-- Add missing role_restriction column to spaces table
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS role_restriction UUID REFERENCES roles(id);

-- Create message types enum
CREATE TYPE message_type AS ENUM (
    'text',
    'markdown', 
    'audio',
    'video',
    'image',
    'file',
    'poll',
    'vote',
    'system',
    'announcement'
);

-- Create channels table
CREATE TABLE channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversations table for 1:1 and group chats
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    name TEXT, -- Optional name for group conversations
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversation participants junction table
CREATE TABLE conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id, user_id)
);

-- Enhanced messages table with threading and dual context support
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    
    -- Context: either in a channel OR conversation (mutually exclusive)
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Threading support
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    thread_count INTEGER DEFAULT 0, -- Denormalized count of direct replies
    
    -- User and timestamps
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Message status
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    
    -- Constraints: message must belong to either channel or conversation
    CONSTRAINT message_context_check CHECK (
        (channel_id IS NOT NULL AND conversation_id IS NULL) OR
        (channel_id IS NULL AND conversation_id IS NOT NULL)
    )
);

-- Message metadata for complex message types (polls, files, reactions, etc.)
CREATE TABLE message_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, key)
);

-- Message reactions
CREATE TABLE message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on all tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
-- Channels indexes
CREATE INDEX idx_channels_space_id ON channels(space_id);
CREATE INDEX idx_channels_created_by ON channels(created_by);
CREATE INDEX idx_channels_created_at ON channels(created_at);

-- Conversations indexes
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Messages indexes
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_message_type ON messages(message_type);

-- Metadata and reactions indexes
CREATE INDEX idx_message_metadata_message_id ON message_metadata(message_id);
CREATE INDEX idx_message_metadata_key ON message_metadata(key);
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- RLS Policies for channels
CREATE POLICY "Users can view channels in their spaces" ON channels FOR SELECT
    USING (
        space_id IN (
            SELECT ur.space_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid()
        )
        OR (NOT is_private AND space_id IN (
            SELECT s.id FROM spaces s WHERE s.role_restriction IS NULL OR s.role_restriction IN (
                SELECT ur.role_id
                FROM user_roles ur
                WHERE ur.user_id = auth.uid()
            )
        ))
    );

CREATE POLICY "Users can create channels in their spaces" ON channels FOR INSERT
    WITH CHECK (
        space_id IN (
            SELECT ur.space_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid()
            AND ur.role_id IN (
                SELECT id FROM roles WHERE name IN ('founder', 'admin', 'editor')
            )
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Channel creators can update their channels" ON channels FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can delete channels" ON channels FOR DELETE
    USING (
        space_id IN (
            SELECT ur.space_id 
            FROM user_roles ur 
            WHERE ur.user_id = auth.uid()
            AND ur.role_id IN (
                SELECT id FROM roles WHERE name IN ('founder', 'admin')
            )
        )
        OR created_by = auth.uid()
    );

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON conversations FOR SELECT
    USING (
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Users can create conversations" ON conversations FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Conversation admins can update conversations" ON conversations FOR UPDATE
    USING (
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
        )
    );

-- RLS Policies for conversation participants
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        )
    );

CREATE POLICY "Conversation admins can manage participants" ON conversation_participants FOR ALL
    USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
        )
    );

CREATE POLICY "Users can join conversations they're invited to" ON conversation_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for enhanced messages
CREATE POLICY "Users can view messages in accessible contexts" ON messages FOR SELECT
    USING (
        -- Channel messages: use existing channel access logic
        (channel_id IS NOT NULL AND channel_id IN (
            SELECT c.id FROM channels c
            WHERE c.space_id IN (
                SELECT ur.space_id 
                FROM user_roles ur 
                WHERE ur.user_id = auth.uid()
            )
                         OR (NOT c.is_private AND c.space_id IN (
                SELECT s.id FROM spaces s WHERE s.role_restriction IS NULL OR s.role_restriction IN (
                    SELECT ur.role_id
                    FROM user_roles ur
                    WHERE ur.user_id = auth.uid()
                )
            ))
        ))
        OR
        -- Conversation messages: user must be participant
        (conversation_id IS NOT NULL AND conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND left_at IS NULL
        ))
    );

CREATE POLICY "Users can create messages in accessible contexts" ON messages FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND (
            -- Channel messages: use existing channel access logic
            (channel_id IS NOT NULL AND channel_id IN (
                SELECT c.id FROM channels c
                WHERE c.space_id IN (
                    SELECT ur.space_id 
                    FROM user_roles ur 
                    WHERE ur.user_id = auth.uid()
                )
            ))
            OR
            -- Conversation messages: user must be participant
            (conversation_id IS NOT NULL AND conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = auth.uid() AND left_at IS NULL
            ))
        )
    );

CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE
    USING (user_id = auth.uid() AND NOT is_deleted);

CREATE POLICY "Users can soft delete their own messages or admins can delete any" ON messages FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (channel_id IS NOT NULL AND channel_id IN (
            SELECT c.id FROM channels c
            WHERE c.space_id IN (
                SELECT ur.space_id 
                FROM user_roles ur 
                WHERE ur.user_id = auth.uid()
                AND ur.role_id IN (
                    SELECT id FROM roles WHERE name IN ('founder', 'admin')
                )
            )
        ))
        OR (conversation_id IS NOT NULL AND conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
        ))
    );

-- RLS Policies for message metadata
CREATE POLICY "Users can view metadata for accessible messages" ON message_metadata FOR SELECT
    USING (
        message_id IN (
            SELECT id FROM messages WHERE 
            (channel_id IS NOT NULL AND channel_id IN (
                SELECT c.id FROM channels c
                WHERE c.space_id IN (
                    SELECT ur.space_id FROM user_roles ur WHERE ur.user_id = auth.uid()
                )
            ))
            OR (conversation_id IS NOT NULL AND conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = auth.uid() AND left_at IS NULL
            ))
        )
    );

CREATE POLICY "Message creators can manage metadata" ON message_metadata FOR ALL
    USING (
        message_id IN (
            SELECT id FROM messages WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for message reactions
CREATE POLICY "Users can view reactions on accessible messages" ON message_reactions FOR SELECT
    USING (
        message_id IN (
            SELECT id FROM messages WHERE 
            (channel_id IS NOT NULL AND channel_id IN (
                SELECT c.id FROM channels c
                WHERE c.space_id IN (
                    SELECT ur.space_id FROM user_roles ur WHERE ur.user_id = auth.uid()
                )
            ))
            OR (conversation_id IS NOT NULL AND conversation_id IN (
                SELECT conversation_id FROM conversation_participants 
                WHERE user_id = auth.uid() AND left_at IS NULL
            ))
        )
    );

CREATE POLICY "Users can manage their own reactions" ON message_reactions FOR ALL
    USING (user_id = auth.uid());

-- Add updated_at triggers
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to validate thread context
CREATE OR REPLACE FUNCTION validate_thread_context()
RETURNS TRIGGER AS $$
DECLARE
    parent_channel_id UUID;
    parent_conversation_id UUID;
BEGIN
    -- If this is a reply (has parent_message_id), validate context
    IF NEW.parent_message_id IS NOT NULL THEN
        SELECT channel_id, conversation_id 
        INTO parent_channel_id, parent_conversation_id
        FROM messages 
        WHERE id = NEW.parent_message_id;
        
        -- Parent message must exist
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent message does not exist';
        END IF;
        
        -- Thread must be in same context as parent
        IF (NEW.channel_id IS NOT NULL AND NEW.channel_id != parent_channel_id) OR
           (NEW.conversation_id IS NOT NULL AND NEW.conversation_id != parent_conversation_id) THEN
            RAISE EXCEPTION 'Thread message must be in same context as parent message';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update thread counts
CREATE OR REPLACE FUNCTION update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET thread_count = thread_count + 1 
        WHERE id = NEW.parent_message_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET thread_count = GREATEST(0, thread_count - 1) 
        WHERE id = OLD.parent_message_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate thread context before insert/update
CREATE TRIGGER validate_message_thread_context
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION validate_thread_context();

-- Trigger to automatically update thread counts
CREATE TRIGGER update_message_thread_count
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_count(); 