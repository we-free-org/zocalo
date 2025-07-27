-- =============================================
-- FIX SPACES RLS INFINITE RECURSION
-- =============================================

-- Drop the problematic spaces policy that causes recursion
DROP POLICY IF EXISTS "Spaces are viewable by authorized users" ON public.spaces;

-- Create a simpler, non-recursive policy for spaces
-- This avoids the circular dependency when loading spaces through user_roles
CREATE POLICY "Authenticated users can view spaces they have access to" ON public.spaces
    FOR SELECT USING (
        -- User created the space
        created_by = auth.uid()
        OR
        -- User is specifically authorized (direct check without recursion)
        EXISTS (
            SELECT 1 FROM public.space_authorized_users sau
            WHERE sau.user_id = auth.uid() AND sau.space_id = spaces.id
        )
        OR
        -- User has any role in this space (direct check without role level verification)
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.space_id = spaces.id
        )
    );

-- The role level restrictions will be handled at the application level
-- This prevents RLS recursion while maintaining security 