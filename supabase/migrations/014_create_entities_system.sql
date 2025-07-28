-- =============================================
-- CREATE ENTITIES SYSTEM FOR FLEXIBLE CONTENT
-- =============================================

-- Entity schemas registry for defining content types
CREATE TABLE entity_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id), -- NULL for system schemas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Base entities table for all content types
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  parent_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  parent_type TEXT, -- 'folder', 'thread', 'event', etc.
  
  -- Core content fields
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- File/URL specific
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  
  -- Event specific  
  event_start TIMESTAMP WITH TIME ZONE,
  event_end TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_link TEXT,
  
  -- Voting specific
  vote_options JSONB,
  vote_results JSONB,
  vote_deadline TIMESTAMP WITH TIME ZONE,
  vote_multiple_choice BOOLEAN DEFAULT false,
  
  -- Status and moderation (like messages)
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'deleted', 'pending_approval', 'draft')),
  encryption_type TEXT DEFAULT 'none' CHECK (encryption_type IN ('none', 'instance_key', 'e2ee')),
  
  -- Edit tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id),
  
  -- Deletion tracking
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Threading/replies
  thread_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_entities_space_id ON entities(space_id);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_parent_id ON entities(parent_id);
CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_entities_created_by ON entities(created_by);
CREATE INDEX idx_entities_created_at ON entities(created_at);
CREATE INDEX idx_entities_last_activity ON entities(last_activity_at);
CREATE INDEX idx_entities_event_start ON entities(event_start) WHERE event_start IS NOT NULL;
CREATE INDEX idx_entities_vote_deadline ON entities(vote_deadline) WHERE vote_deadline IS NOT NULL;

-- Create indexes for schema registry
CREATE INDEX idx_entity_schemas_type ON entity_schemas(type);
CREATE INDEX idx_entity_schemas_active ON entity_schemas(is_active);

-- Add updated_at trigger for entities
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

CREATE TRIGGER trigger_update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_entities_updated_at();

-- Add updated_at trigger for schemas
CREATE OR REPLACE FUNCTION update_entity_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_schemas_updated_at
  BEFORE UPDATE ON entity_schemas
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_schemas_updated_at();

-- RLS Policies for entity_schemas
ALTER TABLE entity_schemas ENABLE ROW LEVEL SECURITY;

-- Everyone can view active schemas
CREATE POLICY "Users can view active entity schemas" ON entity_schemas
  FOR SELECT USING (is_active = true);

-- Authenticated users can create schemas
CREATE POLICY "Authenticated users can create entity schemas" ON entity_schemas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Schema creators can update their own schemas
CREATE POLICY "Schema creators can update their schemas" ON entity_schemas
  FOR UPDATE USING (created_by = auth.uid());

-- RLS Policies for entities
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- Users can view approved and deleted entities in spaces they have access to
CREATE POLICY "Users can view entities in accessible spaces" ON entities
  FOR SELECT USING (
    status IN ('approved', 'deleted') AND
    space_id IN (
      SELECT s.id FROM spaces s
      LEFT JOIN space_authorized_users sau ON s.id = sau.space_id
      WHERE sau.user_id = auth.uid() OR s.created_by = auth.uid()
    )
  );

-- Authenticated users can create entities in accessible spaces
CREATE POLICY "Users can create entities in accessible spaces" ON entities
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    space_id IN (
      SELECT s.id FROM spaces s
      LEFT JOIN space_authorized_users sau ON s.id = sau.space_id
      WHERE sau.user_id = auth.uid() OR s.created_by = auth.uid()
    )
  );

-- Entity creators can update their own entities
CREATE POLICY "Entity creators can update their entities" ON entities
  FOR UPDATE USING (created_by = auth.uid());

-- Entity creators can delete their own entities (soft delete)
CREATE POLICY "Entity creators can delete their entities" ON entities
  FOR UPDATE USING (created_by = auth.uid());

-- Insert initial schema definitions (system schemas with NULL created_by)
INSERT INTO entity_schemas (type, name, description, schema, created_by) VALUES
('event', 'Event', 'Calendar events with date, time, location and participants', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "summary": {"type": "string"},
    "event_start": {"type": "string", "format": "date-time", "required": true},
    "event_end": {"type": "string", "format": "date-time"},
    "event_location": {"type": "string"},
    "event_link": {"type": "string", "format": "uri"},
    "participants": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  }
}', NULL),

('file', 'File', 'File storage with folder organization', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "file_url": {"type": "string", "format": "uri", "required": true},
    "file_name": {"type": "string", "required": true},
    "file_type": {"type": "string", "required": true},
    "file_size": {"type": "number"},
    "parent_id": {"type": "string", "description": "Folder parent ID"}
  }
}', NULL),

('folder', 'Folder', 'Folder for organizing files', '{
  "type": "object", 
  "properties": {
    "title": {"type": "string", "required": true},
    "summary": {"type": "string"},
    "parent_id": {"type": "string", "description": "Parent folder ID"}
  }
}', NULL),

('vote', 'Vote/Poll', 'Voting and polling system', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "summary": {"type": "string"},
    "vote_options": {"type": "array", "items": {"type": "string"}, "required": true},
    "vote_deadline": {"type": "string", "format": "date-time"},
    "vote_multiple_choice": {"type": "boolean", "default": false},
    "vote_anonymous": {"type": "boolean", "default": false}
  }
}', NULL),

('comment', 'Comment', 'Comments and replies on entities', '{
  "type": "object",
  "properties": {
    "content": {"type": "string", "required": true},
    "parent_id": {"type": "string", "required": true, "description": "Entity being commented on"}
  }
}', NULL); 