-- =============================================
-- ZOCALO STORAGE SETUP
-- Separate file for storage configuration due to permission requirements
-- Run this AFTER initial_setup.sql with supabase_storage_admin permissions
-- =============================================


-- =============================================
-- HELPER FUNCTION FOR SAFE UUID COMPARISON
-- =============================================

-- Create a helper function to safely compare UUIDs with text
CREATE OR REPLACE FUNCTION public.safe_uuid_equals(uuid_col UUID, text_val TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if text is a valid UUID format first
    IF text_val !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Safe comparison by casting UUID to text
    RETURN uuid_col::text = text_val;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
DROP POLICY IF EXISTS "Authenticated users can upload to space folders" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view accessible space files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files they own or have edit access" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files they own or have admin access" ON storage.objects;

-- Allow authenticated users to upload files to their space folders
CREATE POLICY "Authenticated users can upload to space folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'files' AND
    auth.uid()::text = owner AND
    EXISTS (
        SELECT 1 FROM space_authorized_users sau
        WHERE public.safe_uuid_equals(sau.space_id, split_part(name, '/', 1))
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
    EXISTS (
        SELECT 1 FROM space_authorized_users sau
        WHERE public.safe_uuid_equals(sau.space_id, split_part(name, '/', 1))
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
            AND public.safe_uuid_equals(ur.space_id, split_part(name, '/', 1))
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
            AND public.safe_uuid_equals(ur.space_id, split_part(name, '/', 1))
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

-- =============================================
-- STORAGE SETUP COMPLETE
-- =============================================

COMMENT ON SCHEMA storage IS 'Zocalo storage setup completed - bucket and policies created';
