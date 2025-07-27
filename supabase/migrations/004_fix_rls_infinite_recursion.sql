-- =============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =============================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Global settings are viewable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Only admins can manage global settings" ON public.settings;
DROP POLICY IF EXISTS "User roles are viewable by space members" ON public.user_roles;

-- =============================================
-- FIXED SETTINGS POLICIES
-- =============================================

-- Allow anyone to read public settings without admin checks
CREATE POLICY "Public settings are viewable by everyone" ON public.settings
    FOR SELECT USING (scope = 'global' AND is_public = true);

-- Private settings require proper authorization
CREATE POLICY "Private settings are viewable by authorized users" ON public.settings
    FOR SELECT USING (
        -- Admins can see all settings
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 3
        )
        OR
        -- Users can see their own settings
        (scope = 'user' AND scope_id = auth.uid())
        OR
        -- Users can see settings for spaces they belong to
        (scope = 'space' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.space_id = settings.scope_id
        ))
    );

-- Insert policy for authenticated users
CREATE POLICY "Authenticated users can insert settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update policy for admins
CREATE POLICY "Only admins can manage global settings" ON public.settings
    FOR UPDATE USING (
        -- System admins can manage global settings
        (scope = 'global' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 4
        ))
        OR
        -- Space admins can manage space settings
        (scope = 'space' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = settings.scope_id 
            AND r.level >= 3
        ))
        OR
        -- Users can manage their own settings
        (scope = 'user' AND scope_id = auth.uid())
    );

-- Delete policy for admins
CREATE POLICY "Only admins can delete settings" ON public.settings
    FOR DELETE USING (
        -- System admins can delete global settings
        (scope = 'global' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 4
        ))
        OR
        -- Space admins can delete space settings
        (scope = 'space' AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = settings.scope_id 
            AND r.level >= 3
        ))
        OR
        -- Users can delete their own settings
        (scope = 'user' AND scope_id = auth.uid())
    );

-- =============================================
-- FIXED USER ROLES POLICIES
-- =============================================

-- Users can always view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- Users can view roles in spaces they belong to (without recursion)
CREATE POLICY "Space members can view roles in their spaces" ON public.user_roles
    FOR SELECT USING (
        -- Check if user has any role in the same space (without recursion)
        space_id IN (
            SELECT DISTINCT ur.space_id 
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    ); 