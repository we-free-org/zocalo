-- =============================================
-- CREATE ACTIVITY TRACKING SYSTEM
-- =============================================

-- Create activity types enum
CREATE TYPE activity_type AS ENUM (
    'channel_created',
    'channel_updated', 
    'channel_deleted',
    'message_posted',
    'message_edited',
    'message_deleted',
    'event_created',
    'event_updated',
    'event_deleted',
    'file_uploaded',
    'file_deleted',
    'entity_created',
    'entity_updated',
    'entity_deleted',
    'comment_created',
    'comment_updated',
    'comment_deleted',
    'member_invited',
    'member_role_changed',
    'space_permission_granted',
    'space_permission_revoked'
);

-- Create activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type activity_type NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    
    -- Target entity information
    target_id UUID, -- ID of the affected entity
    target_type TEXT, -- Type of the affected entity (channel, message, event, file, etc.)
    target_name TEXT, -- Name/title of the affected entity for display
    
    -- Activity details
    description TEXT NOT NULL, -- Human readable description
    metadata JSONB DEFAULT '{}', -- Additional activity data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX activities_user_created_idx ON activities (user_id, created_at DESC);
CREATE INDEX activities_space_created_idx ON activities (space_id, created_at DESC);
CREATE INDEX activities_type_created_idx ON activities (type, created_at DESC);
CREATE INDEX activities_created_idx ON activities (created_at DESC);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activities
-- Users can view activities for spaces they have access to
CREATE POLICY "Users can view activities for authorized spaces" ON activities
  FOR SELECT USING (
    space_id IS NULL OR
    EXISTS (
      SELECT 1 FROM space_authorized_users sau 
      WHERE sau.space_id = activities.space_id 
      AND sau.user_id = auth.uid()
    )
  );

-- Only the system (through triggers) can insert activities
CREATE POLICY "System can insert activities" ON activities
  FOR INSERT WITH CHECK (true);

-- =============================================
-- TRIGGER FUNCTIONS FOR ACTIVITY TRACKING
-- =============================================

-- Generic function to log activities
CREATE OR REPLACE FUNCTION log_activity(
    p_type activity_type,
    p_user_id UUID,
    p_space_id UUID,
    p_target_id UUID DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_target_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    INSERT INTO activities (
        type, user_id, space_id, target_id, target_type, target_name, description, metadata
    ) VALUES (
        p_type, p_user_id, p_space_id, p_target_id, p_target_type, p_target_name, p_description, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CHANNEL ACTIVITY TRIGGERS
-- =============================================

-- Channel created trigger
CREATE OR REPLACE FUNCTION trigger_channel_created() RETURNS trigger AS $$
BEGIN
    PERFORM log_activity(
        'channel_created',
        NEW.created_by,
        NEW.space_id,
        NEW.id,
        'channel',
        NEW.name,
        'Created channel "' || NEW.name || '"',
        jsonb_build_object('channel_description', NEW.description, 'is_private', NEW.is_private)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channel_created_trigger
    AFTER INSERT ON channels
    FOR EACH ROW EXECUTE FUNCTION trigger_channel_created();

-- =============================================
-- MESSAGE ACTIVITY TRIGGERS
-- =============================================

-- Message posted trigger
CREATE OR REPLACE FUNCTION trigger_message_posted() RETURNS trigger AS $$
DECLARE
    space_id_val UUID;
    channel_name TEXT;
    activity_desc TEXT;
BEGIN
    -- Get space_id from channel if message is in a channel
    IF NEW.channel_id IS NOT NULL THEN
        SELECT c.space_id, c.name INTO space_id_val, channel_name
        FROM channels c WHERE c.id = NEW.channel_id;
        activity_desc := 'Posted message in #' || channel_name;
    ELSE
        -- For conversation messages, we don't have a space_id
        space_id_val := NULL;
        activity_desc := 'Posted message in conversation';
    END IF;
    
    PERFORM log_activity(
        'message_posted',
        NEW.user_id,
        space_id_val,
        NEW.id,
        'message',
        LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
        activity_desc,
        jsonb_build_object('message_type', NEW.message_type, 'channel_id', NEW.channel_id, 'conversation_id', NEW.conversation_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_posted_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION trigger_message_posted();

-- Message edited trigger
CREATE OR REPLACE FUNCTION trigger_message_edited() RETURNS trigger AS $$
DECLARE
    space_id_val UUID;
    channel_name TEXT;
    activity_desc TEXT;
BEGIN
    -- Only log if content actually changed and edited_at was updated
    IF OLD.content != NEW.content AND NEW.edited_at IS NOT NULL AND OLD.edited_at IS DISTINCT FROM NEW.edited_at THEN
        -- Get space_id from channel if message is in a channel
        IF NEW.channel_id IS NOT NULL THEN
            SELECT c.space_id, c.name INTO space_id_val, channel_name
            FROM channels c WHERE c.id = NEW.channel_id;
            activity_desc := 'Edited message in #' || channel_name;
        ELSE
            space_id_val := NULL;
            activity_desc := 'Edited message in conversation';
        END IF;
        
        PERFORM log_activity(
            'message_edited',
            NEW.user_id,
            space_id_val,
            NEW.id,
            'message',
            LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
            activity_desc,
            jsonb_build_object('message_type', NEW.message_type, 'channel_id', NEW.channel_id, 'conversation_id', NEW.conversation_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_edited_trigger
    AFTER UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION trigger_message_edited();

-- =============================================
-- ENTITY ACTIVITY TRIGGERS (for events, files, etc.)
-- =============================================

-- Entity created trigger
CREATE OR REPLACE FUNCTION trigger_entity_created() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
BEGIN
    entity_display_name := COALESCE(NEW.title, NEW.file_name, 'Untitled');
    
    CASE NEW.type
        WHEN 'event' THEN
            activity_desc := 'Created event "' || entity_display_name || '"';
        WHEN 'file' THEN
            activity_desc := 'Uploaded file "' || entity_display_name || '"';
        WHEN 'folder' THEN
            activity_desc := 'Created folder "' || entity_display_name || '"';
        WHEN 'comment' THEN
            activity_desc := 'Posted comment';
        WHEN 'vote' THEN
            activity_desc := 'Created poll "' || entity_display_name || '"';
        ELSE
            activity_desc := 'Created ' || NEW.type || ' "' || entity_display_name || '"';
    END CASE;
    
    PERFORM log_activity(
        'entity_created',
        NEW.created_by,
        NEW.space_id,
        NEW.id,
        NEW.type,
        entity_display_name,
        activity_desc,
        jsonb_build_object(
            'entity_type', NEW.type,
            'parent_id', NEW.parent_id,
            'parent_type', NEW.parent_type,
            'file_size', NEW.file_size,
            'event_start', NEW.event_start,
            'event_end', NEW.event_end
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_created_trigger
    AFTER INSERT ON entities
    FOR EACH ROW EXECUTE FUNCTION trigger_entity_created();

-- Entity updated trigger
CREATE OR REPLACE FUNCTION trigger_entity_updated() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
BEGIN
    -- Only log if significant fields changed and is_edited flag is set
    IF (OLD.title IS DISTINCT FROM NEW.title OR 
        OLD.content IS DISTINCT FROM NEW.content OR 
        OLD.event_start IS DISTINCT FROM NEW.event_start OR 
        OLD.event_end IS DISTINCT FROM NEW.event_end OR
        OLD.event_location IS DISTINCT FROM NEW.event_location) 
        AND NEW.is_edited = true AND OLD.edited_at IS DISTINCT FROM NEW.edited_at THEN
        
        entity_display_name := COALESCE(NEW.title, NEW.file_name, 'Untitled');
        
        CASE NEW.type
            WHEN 'event' THEN
                activity_desc := 'Updated event "' || entity_display_name || '"';
            WHEN 'file' THEN
                activity_desc := 'Updated file "' || entity_display_name || '"';
            WHEN 'folder' THEN
                activity_desc := 'Updated folder "' || entity_display_name || '"';
            WHEN 'comment' THEN
                activity_desc := 'Edited comment';
            WHEN 'vote' THEN
                activity_desc := 'Updated poll "' || entity_display_name || '"';
            ELSE
                activity_desc := 'Updated ' || NEW.type || ' "' || entity_display_name || '"';
        END CASE;
        
        PERFORM log_activity(
            'entity_updated',
            NEW.edited_by,
            NEW.space_id,
            NEW.id,
            NEW.type,
            entity_display_name,
            activity_desc,
            jsonb_build_object(
                'entity_type', NEW.type,
                'parent_id', NEW.parent_id,
                'parent_type', NEW.parent_type
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_updated_trigger
    AFTER UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION trigger_entity_updated();

-- Entity deleted trigger (soft delete)
CREATE OR REPLACE FUNCTION trigger_entity_deleted() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
BEGIN
    -- Only log when status changes to 'deleted' and deleted_at is set
    IF OLD.status != 'deleted' AND NEW.status = 'deleted' AND NEW.deleted_at IS NOT NULL THEN
        entity_display_name := COALESCE(NEW.title, NEW.file_name, 'Untitled');
        
        CASE NEW.type
            WHEN 'event' THEN
                activity_desc := 'Deleted event "' || entity_display_name || '"';
            WHEN 'file' THEN
                activity_desc := 'Deleted file "' || entity_display_name || '"';
            WHEN 'folder' THEN
                activity_desc := 'Deleted folder "' || entity_display_name || '"';
            WHEN 'comment' THEN
                activity_desc := 'Deleted comment';
            WHEN 'vote' THEN
                activity_desc := 'Deleted poll "' || entity_display_name || '"';
            ELSE
                activity_desc := 'Deleted ' || NEW.type || ' "' || entity_display_name || '"';
        END CASE;
        
        PERFORM log_activity(
            'entity_deleted',
            NEW.deleted_by,
            NEW.space_id,
            NEW.id,
            NEW.type,
            entity_display_name,
            activity_desc,
            jsonb_build_object('entity_type', NEW.type)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_deleted_trigger
    AFTER UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION trigger_entity_deleted();

-- =============================================
-- MEMBER MANAGEMENT ACTIVITY TRIGGERS
-- =============================================

-- Space permission granted trigger
CREATE OR REPLACE FUNCTION trigger_space_permission_granted() RETURNS trigger AS $$
DECLARE
    space_name TEXT;
    user_name TEXT;
    activity_desc TEXT;
BEGIN
    -- Get space name and user name for description
    SELECT s.name INTO space_name FROM spaces s WHERE s.id = NEW.space_id;
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email) INTO user_name 
    FROM auth.users u 
    LEFT JOIN profiles p ON p.id = u.id 
    WHERE u.id = NEW.user_id;
    
    activity_desc := 'Granted access to ' || COALESCE(user_name, 'user') || ' for space "' || COALESCE(space_name, 'Unknown') || '"';
    
    PERFORM log_activity(
        'space_permission_granted',
        COALESCE(NEW.authorized_by, NEW.user_id), -- Fall back to user_id if authorized_by is null
        NEW.space_id,
        NEW.user_id,
        'user',
        user_name,
        activity_desc,
        jsonb_build_object('space_name', space_name)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER space_permission_granted_trigger
    AFTER INSERT ON space_authorized_users
    FOR EACH ROW EXECUTE FUNCTION trigger_space_permission_granted();

-- Space permission revoked trigger
CREATE OR REPLACE FUNCTION trigger_space_permission_revoked() RETURNS trigger AS $$
DECLARE
    space_name TEXT;
    user_name TEXT;
    activity_desc TEXT;
    revoker_id UUID;
BEGIN
    -- Get space name and user name for description
    SELECT s.name INTO space_name FROM spaces s WHERE s.id = OLD.space_id;
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email) INTO user_name 
    FROM auth.users u 
    LEFT JOIN profiles p ON p.id = u.id 
    WHERE u.id = OLD.user_id;
    
    -- Get current user as the one revoking (since we can't pass this in trigger context)
    revoker_id := auth.uid();
    
    activity_desc := 'Revoked access from ' || COALESCE(user_name, 'user') || ' for space "' || COALESCE(space_name, 'Unknown') || '"';
    
    PERFORM log_activity(
        'space_permission_revoked',
        COALESCE(revoker_id, OLD.user_id), -- Fall back to user_id if no current user
        OLD.space_id,
        OLD.user_id,
        'user',
        user_name,
        activity_desc,
        jsonb_build_object('space_name', space_name)
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER space_permission_revoked_trigger
    AFTER DELETE ON space_authorized_users
    FOR EACH ROW EXECUTE FUNCTION trigger_space_permission_revoked(); 