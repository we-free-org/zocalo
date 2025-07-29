-- =============================================
-- FIX ANONYMOUS ENTITY ACTIVITY LOGGING
-- Skip activity logging for anonymous entities (created_by is NULL)
-- =============================================

-- Update entity created trigger to handle anonymous entities
CREATE OR REPLACE FUNCTION trigger_entity_created() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
    entity_content JSONB;
BEGIN
    -- Skip activity logging for anonymous entities (preserves anonymity)
    IF NEW.created_by IS NULL THEN
        RETURN NEW;
    END IF;

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
        WHEN 'vote_submission' THEN
            -- Don't log individual vote submissions to avoid spam
            RETURN NEW;
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