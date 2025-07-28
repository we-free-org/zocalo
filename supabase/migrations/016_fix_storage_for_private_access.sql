-- =============================================
-- SUPABASE STORAGE FOR PRIVATE FILE ACCESS
-- =============================================

-- Create the files bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- =============================================
-- STORAGE POLICIES FOR PRIVATE ACCESS
-- =============================================

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can upload files to their space" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from accessible spaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files they own or can modify" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files they own or can modify" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to space folders" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to files" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update their files" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete their files" ON storage.objects;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload files to their space folders
CREATE POLICY "Authenticated users can upload to space folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid()::text = owner AND
  -- File path should start with a space_id that user has access to
  EXISTS (
    SELECT 1 FROM space_authorized_users sau
    WHERE sau.space_id = (split_part(name, '/', 1))::uuid
    AND sau.user_id = auth.uid()
  )
);

-- Allow authenticated users to view files from accessible spaces
CREATE POLICY "Authenticated users can view accessible space files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'files' AND
  -- File path should start with a space_id that user has access to
  EXISTS (
    SELECT 1 FROM space_authorized_users sau
    WHERE sau.space_id = (split_part(name, '/', 1))::uuid
    AND sau.user_id = auth.uid()
  )
);

-- Allow users to update files they own or have permission to modify
CREATE POLICY "Users can update files they own or have edit access"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' AND
  (
    auth.uid()::text = owner OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND ur.space_id = (split_part(name, '/', 1))::uuid
      AND r.level >= 2 -- Editor level or higher
    )
  )
);

-- Allow users to delete files they own or have admin access
CREATE POLICY "Users can delete files they own or have admin access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  (
    auth.uid()::text = owner OR
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
-- GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users for storage operations
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 