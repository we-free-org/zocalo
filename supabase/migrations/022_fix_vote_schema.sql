-- =============================================
-- FIX VOTE ENTITY SCHEMA
-- Remove title from content schema since it's a base entity field
-- =============================================

-- Update vote schema to remove title from content properties and required fields
UPDATE entity_schemas SET schema = '{
  "type": "object",
  "required": ["vote_options"],
  "properties": {
    "vote_options": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "vote_deadline": {
      "type": "string",
      "format": "date-time"
    },
    "vote_anonymous": {
      "type": "boolean",
      "default": false
    },
    "max_votes_per_user": {
      "type": "integer",
      "default": 1,
      "minimum": 1,
      "description": "Total number of votes a user can cast across all options"
    },
    "vote_multiple_choice": {
      "type": "boolean",
      "default": false
    },
    "vote_scoring_enabled": {
      "type": "boolean",
      "default": false,
      "description": "Whether users can assign a score to options instead of a single vote"
    },
    "vote_result_visibility": {
      "enum": [
        "always_visible",
        "after_deadline",
        "never"
      ],
      "type": "string",
      "default": "always_visible",
      "description": "When the vote results are visible"
    },
    "allow_multiple_votes_per_option": {
      "type": "boolean",
      "default": false,
      "description": "Whether a user can allocate more than one vote to the same option"
    }
  }
}' WHERE type = 'vote'; 