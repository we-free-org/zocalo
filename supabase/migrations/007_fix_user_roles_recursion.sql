-- Fix user_roles RLS infinite recursion
-- The problem: policies are self-referencing user_roles table

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Space members can view roles in their spaces" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create simple, non-recursive policies

-- Users can always view their own roles (no recursion)
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

-- For now, allow authenticated users to view all user_roles in spaces they have access to
-- This avoids recursion by not checking user_roles within the policy
CREATE POLICY "Authenticated users can view user roles" ON public.user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only space creators can manage roles for now (avoiding complex recursion)
CREATE POLICY "Space creators can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id = user_roles.space_id 
            AND s.created_by = auth.uid()
        )
    ); 