-- =============================================
-- COMPLETELY ISOLATE PUBLIC SETTINGS FROM USER_ROLES
-- =============================================

-- Drop all existing settings policies
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Private settings are viewable by authorized users" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can manage global settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can delete settings" ON public.settings;

-- Create completely isolated policy for public settings (no user_roles dependency)
CREATE POLICY "Allow public global settings access" ON public.settings
    FOR SELECT USING (
        scope = 'global' AND is_public = true
    );

-- Create policy for user's own settings (no recursion possible)
CREATE POLICY "Users can access their own settings" ON public.settings
    FOR ALL USING (
        scope = 'user' AND scope_id = auth.uid()
    );

-- Create policy for authenticated users to insert settings
CREATE POLICY "Authenticated users can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

-- For admin access to private settings, we'll temporarily disable this to avoid recursion
-- (This can be re-enabled later when the user_roles policies are stable)

-- =============================================
-- ENSURE SETTINGS ARE PROPERLY MARKED AS PUBLIC
-- =============================================

-- Update settings to ensure they are marked as public
UPDATE public.settings 
SET is_public = true 
WHERE key IN (
    'instance_name', 
    'instance_domain', 
    'allow_public_signup', 
    'require_email_confirmation'
) AND scope = 'global';

-- Make sure setup_completed is NOT public (only admins should see this)
UPDATE public.settings 
SET is_public = false 
WHERE key = 'setup_completed' AND scope = 'global'; 