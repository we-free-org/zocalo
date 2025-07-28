-- =============================================
-- FIX STORAGE BUCKET CONFIGURATION
-- =============================================

-- Update the files bucket to ensure proper public access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'files';

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remove any conflicting policies first
DROP POLICY IF EXISTS "Users can upload files to their space" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from accessible spaces" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files they own or can modify" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files they own or can modify" ON storage.objects;

-- Recreate policies with proper structure
CREATE POLICY "Allow authenticated uploads to space folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid()::text = owner
);

CREATE POLICY "Allow public read access to files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'files');

CREATE POLICY "Allow owners to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'files' AND
  auth.uid()::text = owner
);

CREATE POLICY "Allow owners to delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'files' AND
  auth.uid()::text = owner
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon; 