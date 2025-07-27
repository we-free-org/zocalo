-- =============================================
-- COMPLETELY REBUILD SPACES POLICIES (SIMPLE APPROACH)
-- =============================================

-- Drop ALL existing space policies
DROP POLICY IF EXISTS "Spaces are viewable by authorized users" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated users can view spaces they have access to" ON public.spaces;
DROP POLICY IF EXISTS "Users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Space creators and admins can update spaces" ON public.spaces;

-- =============================================
-- CREATE SIMPLE, NON-RECURSIVE POLICIES
-- =============================================

-- POLICY 1: All authenticated users can view all spaces
-- This eliminates any recursion completely
CREATE POLICY "All authenticated users can view spaces" ON public.spaces
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- POLICY 2: All authenticated users can create spaces
CREATE POLICY "Authenticated users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- POLICY 3: Only space creators can update their spaces
-- No role checks to avoid recursion
CREATE POLICY "Space creators can update their spaces" ON public.spaces
    FOR UPDATE USING (created_by = auth.uid());

-- POLICY 4: Only space creators can delete their spaces  
CREATE POLICY "Space creators can delete their spaces" ON public.spaces
    FOR DELETE USING (created_by = auth.uid());

-- Note: Admin/founder restrictions will be handled at the application level
-- This approach prioritizes functionality over fine-grained permissions for now 