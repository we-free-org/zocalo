-- =============================================
-- SUPABASE STORAGE BUCKET AND POLICIES FOR FILES
-- =============================================

-- Create the files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true);

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Allow authenticated users to upload files to their space
CREATE POLICY "Users can upload files to their space"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  -- File path should start with space_id that user has access to
  EXISTS (
    SELECT 1 FROM space_authorized_users sau
    WHERE sau.space_id = (split_part(name, '/', 1))::uuid
    AND sau.user_id = auth.uid()
  )
);

-- Allow authenticated users to view files from spaces they have access to
CREATE POLICY "Users can view files from accessible spaces"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND
  -- File path should start with space_id that user has access to
  EXISTS (
    SELECT 1 FROM space_authorized_users sau
    WHERE sau.space_id = (split_part(name, '/', 1))::uuid
    AND sau.user_id = auth.uid()
  )
);

-- Allow users to update files they own or have permission to modify
CREATE POLICY "Users can update files they own or can modify"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' AND
  -- Either they own the file OR they have admin/editor role in the space
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.space_id = (split_part(name, '/', 1))::uuid
      AND r.level >= 2 -- Editor level or higher
    )
  )
);

-- Allow users to delete files they own or have permission to modify
CREATE POLICY "Users can delete files they own or can modify"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  -- Either they own the file OR they have admin/founder role in the space
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.space_id = (split_part(name, '/', 1))::uuid
      AND r.level >= 3 -- Admin level or higher
    )
  )
);

-- =============================================
-- HELPER FUNCTION FOR FILE ACCESS VALIDATION
-- =============================================

-- Function to check if user has access to a file based on the entity record
CREATE OR REPLACE FUNCTION check_file_access(
  file_entity_id uuid,
  user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to the space where the file entity exists
  RETURN EXISTS (
    SELECT 1 
    FROM entities e
    JOIN space_authorized_users sau ON e.space_id = sau.space_id
    WHERE e.id = file_entity_id
    AND e.type = 'file'
    AND sau.user_id = user_id
  );
END;
$$;

-- =============================================
-- ADDITIONAL RLS POLICIES FOR ENTITIES TABLE
-- (if not already covered by existing policies)
-- =============================================

-- Allow users to see file entities from spaces they have access to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'entities' 
    AND policyname = 'Users can view file entities from accessible spaces'
  ) THEN
    CREATE POLICY "Users can view file entities from accessible spaces"
    ON entities
    FOR SELECT
    TO authenticated
    USING (
      type IN ('file', 'folder') AND
      EXISTS (
        SELECT 1 FROM space_authorized_users sau
        WHERE sau.space_id = entities.space_id
        AND sau.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Allow users to create file entities in spaces they have access to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'entities' 
    AND policyname = 'Users can create file entities in accessible spaces'
  ) THEN
    CREATE POLICY "Users can create file entities in accessible spaces"
    ON entities
    FOR INSERT
    TO authenticated
    WITH CHECK (
      type IN ('file', 'folder') AND
      EXISTS (
        SELECT 1 FROM space_authorized_users sau
        WHERE sau.space_id = entities.space_id
        AND sau.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Allow users to update file entities they own or have permission to modify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'entities' 
    AND policyname = 'Users can update file entities they own or can modify'
  ) THEN
    CREATE POLICY "Users can update file entities they own or can modify"
    ON entities
    FOR UPDATE
    TO authenticated
    USING (
      type IN ('file', 'folder') AND
      -- Either they own the entity OR they have editor role or higher in the space
      (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = auth.uid()
          AND ur.space_id = entities.space_id
          AND r.level >= 2 -- Editor level or higher
        )
      )
    );
  END IF;
END $$; 