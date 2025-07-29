-- =============================================
-- ADD VOTE SUBMISSION ENTITY SCHEMA
-- =============================================

-- Insert vote_submission schema if it doesn't exist
INSERT INTO entity_schemas (type, name, description, schema, created_by) 
SELECT 'vote_submission', 'Vote Submission', 'Individual vote submissions for tracking user votes', '{
  "type": "object",
  "required": [
    "vote_id",
    "choice_index", 
    "timestamp"
  ],
  "properties": {
    "vote_id": {
      "type": "string",
      "format": "uuid"
    },
    "choice_index": {
      "type": "integer",
      "description": "Index of the selected vote option"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "score": {
      "type": "number",
      "description": "Optional score given to the option, required if vote_scoring_enabled"
    },
    "user_id_hash": {
      "type": "string",
      "description": "Hash of the user ID for anonymous voting"
    }
  }
}', NULL
WHERE NOT EXISTS (SELECT 1 FROM entity_schemas WHERE type = 'vote_submission'); 