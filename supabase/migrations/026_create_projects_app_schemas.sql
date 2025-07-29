-- =============================================
-- CREATE PROJECTS APP ENTITY SCHEMAS
-- =============================================

-- Insert entity schemas for the projects app
INSERT INTO entity_schemas (type, name, description, schema, created_by) VALUES

-- Project schema - minimal details, container for lists
('project', 'Project', 'Project container for organizing tasks in kanban boards', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "status": {
      "type": "string", 
      "enum": ["planning", "active", "completed", "archived"],
      "default": "planning"
    },
    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
    "deadline": {"type": "string", "format": "date-time"},
    "team_members": {"type": "array", "items": {"type": "string"}},
    "settings": {
      "type": "object",
      "properties": {
        "allow_comments": {"type": "boolean", "default": true},
        "allow_attachments": {"type": "boolean", "default": true},
        "visibility": {"type": "string", "enum": ["private", "team", "public"], "default": "team"}
      }
    }
  }
}', NULL),

-- List schema - kanban columns to organize tasks
('project_list', 'Project List', 'Kanban columns for organizing tasks within projects', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "position": {"type": "number", "required": true},
    "project_id": {"type": "string", "required": true},
    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
    "list_type": {
      "type": "string",
      "enum": ["todo", "in_progress", "review", "done", "custom"],
      "default": "custom"
    },
    "settings": {
      "type": "object",
      "properties": {
        "task_limit": {"type": "number"},
        "auto_archive": {"type": "boolean", "default": false},
        "collapsed": {"type": "boolean", "default": false}
      }
    }
  }
}', NULL),

-- Task schema - main work items, can be nested
('project_task', 'Project Task', 'Individual tasks that can be organized in lists or nested under other tasks', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["todo", "in_progress", "review", "done", "blocked"],
      "default": "todo"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "urgent"],
      "default": "medium"
    },
    "assignee_id": {"type": "string"},
    "assignee_name": {"type": "string"},
    "due_date": {"type": "string", "format": "date-time"},
    "start_date": {"type": "string", "format": "date-time"},
    "estimated_hours": {"type": "number"},
    "actual_hours": {"type": "number"},
    "position": {"type": "number", "required": true},
    "project_id": {"type": "string", "required": true},
    "list_id": {"type": "string"},
    "labels": {"type": "array", "items": {"type": "string"}},
    "checklist": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "text": {"type": "string"},
          "completed": {"type": "boolean", "default": false}
        }
      }
    },
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "url": {"type": "string"},
          "type": {"type": "string"}
        }
      }
    }
  }
}', NULL); 