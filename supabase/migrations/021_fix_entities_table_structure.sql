-- =============================================
-- FIX ENTITIES TABLE STRUCTURE
-- Remove entity-specific fields and keep only generic fields
-- =============================================

-- Drop existing indexes on fields we're removing
DROP INDEX IF EXISTS idx_entities_event_start;
DROP INDEX IF EXISTS idx_entities_vote_deadline;

-- Remove entity-specific columns from entities table
-- These should be stored as JSON in the content field instead
ALTER TABLE entities DROP COLUMN IF EXISTS file_url;
ALTER TABLE entities DROP COLUMN IF EXISTS file_name;
ALTER TABLE entities DROP COLUMN IF EXISTS file_type;
ALTER TABLE entities DROP COLUMN IF EXISTS file_size;
ALTER TABLE entities DROP COLUMN IF EXISTS event_start;
ALTER TABLE entities DROP COLUMN IF EXISTS event_end;
ALTER TABLE entities DROP COLUMN IF EXISTS event_location;
ALTER TABLE entities DROP COLUMN IF EXISTS event_link;
ALTER TABLE entities DROP COLUMN IF EXISTS vote_options;
ALTER TABLE entities DROP COLUMN IF EXISTS vote_results;
ALTER TABLE entities DROP COLUMN IF EXISTS vote_deadline;
ALTER TABLE entities DROP COLUMN IF EXISTS vote_multiple_choice;

-- Add updated_at column that was missing
ALTER TABLE entities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update trigger function to also set updated_at
CREATE OR REPLACE FUNCTION update_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Update parent's last_activity_at if this is a threaded reply
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE entities 
    SET last_activity_at = NOW(),
        thread_count = COALESCE(thread_count, 0) + 1
    WHERE id = NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update entity schemas to use proper JSON Schema syntax
UPDATE entity_schemas SET schema = '{
  "type": "object",
  "properties": {
    "event_start": {"type": "string", "format": "date-time"},
    "event_end": {"type": "string", "format": "date-time"},
    "event_location": {"type": "string"},
    "event_link": {"type": "string", "format": "uri"},
    "participants": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  },
  "required": ["event_start"]
}' WHERE type = 'event';

UPDATE entity_schemas SET schema = '{
  "type": "object",
  "properties": {
    "file_url": {"type": "string", "format": "uri"},
    "file_name": {"type": "string"},
    "file_type": {"type": "string"},
    "file_size": {"type": "number"},
    "upload_path": {"type": "string"},
    "original_name": {"type": "string"}
  },
  "required": ["file_name", "file_type"]
}' WHERE type = 'file';

UPDATE entity_schemas SET schema = '{
  "type": "object",
  "properties": {},
  "required": []
}' WHERE type = 'folder';

UPDATE entity_schemas SET schema = '{
  "type": "object",
  "properties": {
    "vote_options": {"type": "array", "items": {"type": "string"}},
    "vote_deadline": {"type": "string", "format": "date-time"},
    "vote_multiple_choice": {"type": "boolean", "default": false},
    "vote_anonymous": {"type": "boolean", "default": false}
  },
  "required": ["vote_options"]
}' WHERE type = 'vote';

UPDATE entity_schemas SET schema = '{
  "type": "object",
  "properties": {
    "content": {"type": "string"}
  },
  "required": ["content"]
}' WHERE type = 'comment';

-- Also update activity triggers to work with new structure
-- Update entity activity triggers to use content field for entity names
CREATE OR REPLACE FUNCTION trigger_entity_created() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
    entity_content JSONB;
BEGIN
    -- Parse content if it exists
    entity_content := COALESCE(NEW.content::jsonb, '{}'::jsonb);
    
    -- Get display name from title or content
    entity_display_name := COALESCE(NEW.title, entity_content->>'file_name', 'Untitled');
    
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
            'content_preview', LEFT(COALESCE(NEW.content, ''), 100)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_entity_updated() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
    entity_content JSONB;
BEGIN
    -- Only log if significant fields changed and is_edited flag is set
    IF (OLD.title IS DISTINCT FROM NEW.title OR 
        OLD.content IS DISTINCT FROM NEW.content) 
        AND NEW.is_edited = true AND OLD.edited_at IS DISTINCT FROM NEW.edited_at THEN
        
        -- Parse content if it exists
        entity_content := COALESCE(NEW.content::jsonb, '{}'::jsonb);
        
        -- Get display name from title or content
        entity_display_name := COALESCE(NEW.title, entity_content->>'file_name', 'Untitled');
        
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

CREATE OR REPLACE FUNCTION trigger_entity_deleted() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
    entity_content JSONB;
BEGIN
    -- Only log when status changes to 'deleted' and deleted_at is set
    IF OLD.status != 'deleted' AND NEW.status = 'deleted' AND NEW.deleted_at IS NOT NULL THEN
        -- Parse content if it exists
        entity_content := COALESCE(NEW.content::jsonb, '{}'::jsonb);
        
        -- Get display name from title or content
        entity_display_name := COALESCE(NEW.title, entity_content->>'file_name', 'Untitled');
        
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