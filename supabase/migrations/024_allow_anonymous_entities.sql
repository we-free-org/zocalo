-- =============================================
-- ALLOW ANONYMOUS ENTITIES
-- Make created_by nullable for anonymous submissions
-- =============================================

-- Remove the NOT NULL constraint from created_by
ALTER TABLE entities ALTER COLUMN created_by DROP NOT NULL;

-- Update the constraint to allow NULL for anonymous submissions
-- The foreign key constraint will still work for non-NULL values
COMMENT ON COLUMN entities.created_by IS 'User who created the entity. NULL for anonymous submissions.'; 