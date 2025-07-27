-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE role_level AS ENUM ('1', '2', '3', '4');

-- =============================================
-- CREATE ALL TABLES FIRST
-- =============================================

-- PROFILES TABLE (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    reputation_points INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ROLES TABLE
CREATE TABLE public.roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SPACES TABLE
CREATE TABLE public.spaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_role_level INTEGER CHECK (minimum_role_level >= 1 AND minimum_role_level <= 4),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- USER_ROLES TABLE
CREATE TABLE public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, space_id)
);

-- SPACE_AUTHORIZED_USERS TABLE
CREATE TABLE public.space_authorized_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(space_id, user_id)
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_authorized_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE ALL RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Roles policies
CREATE POLICY "Roles are viewable by everyone" ON public.roles
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage roles" ON public.roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 3
        )
    );

-- Spaces policies
CREATE POLICY "Spaces are viewable by authorized users" ON public.spaces
    FOR SELECT USING (
        -- User has sufficient role level
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = spaces.id
            AND (minimum_role_level IS NULL OR r.level >= minimum_role_level)
        )
        OR
        -- User is specifically authorized
        EXISTS (
            SELECT 1 FROM public.space_authorized_users sau
            WHERE sau.user_id = auth.uid() AND sau.space_id = spaces.id
        )
        OR
        -- User created the space
        created_by = auth.uid()
    );

CREATE POLICY "Users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Space creators and admins can update spaces" ON public.spaces
    FOR UPDATE USING (
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = spaces.id
            AND r.level >= 3
        )
    );

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Space members can view roles in their spaces" ON public.user_roles
    FOR SELECT USING (
        -- Check if user has any role in the same space (without recursion)
        space_id IN (
            SELECT DISTINCT ur.space_id 
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can assign roles" ON public.user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = user_roles.space_id
            AND r.level >= 3
        )
        OR
        -- Space creator can assign roles
        EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id = user_roles.space_id AND s.created_by = auth.uid()
        )
    );

CREATE POLICY "Admins can update roles" ON public.user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = user_roles.space_id
            AND r.level >= 3
        )
    );

CREATE POLICY "Admins can delete roles" ON public.user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = user_roles.space_id
            AND r.level >= 3
        )
    );

-- Space authorized users policies
CREATE POLICY "Authorized users are viewable by space members" ON public.space_authorized_users
    FOR SELECT USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.space_id = space_authorized_users.space_id
        )
    );

CREATE POLICY "Admins can authorize users" ON public.space_authorized_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = space_authorized_users.space_id
            AND r.level >= 3
        )
    );

CREATE POLICY "Admins can remove authorized users" ON public.space_authorized_users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND ur.space_id = space_authorized_users.space_id
            AND r.level >= 3
        )
    );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_space_id ON public.user_roles(space_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_spaces_created_by ON public.spaces(created_by);
CREATE INDEX idx_space_authorized_users_space_id ON public.space_authorized_users(space_id);
CREATE INDEX idx_space_authorized_users_user_id ON public.space_authorized_users(user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_spaces
    BEFORE UPDATE ON public.spaces
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to auto-assign founder role when creating first space
CREATE OR REPLACE FUNCTION public.handle_space_creation()
RETURNS TRIGGER AS $$
DECLARE
    founder_role_id UUID;
BEGIN
    -- Get founder role ID
    SELECT id INTO founder_role_id FROM public.roles WHERE name = 'founder';
    
    -- Assign founder role to space creator
    INSERT INTO public.user_roles (user_id, role_id, space_id, assigned_by)
    VALUES (NEW.created_by, founder_role_id, NEW.id, NEW.created_by);
    
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to auto-assign founder role on space creation
CREATE TRIGGER on_space_created
    AFTER INSERT ON public.spaces
    FOR EACH ROW EXECUTE PROCEDURE public.handle_space_creation();

-- =============================================
-- SEED DATA - DEFAULT ROLES
-- =============================================
INSERT INTO public.roles (name, description, level, is_custom) VALUES
    ('founder', 'Full system access, can manage everything including spaces and users', 4, false),
    ('admin', 'Space management, user management, and content oversight', 3, false),
    ('editor', 'Content creation, editing, and moderate user management', 2, false),
    ('viewer', 'Read-only access to content within authorized spaces', 1, false);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

GRANT ALL ON public.roles TO authenticated;
GRANT SELECT ON public.roles TO anon;

GRANT ALL ON public.spaces TO authenticated;
GRANT SELECT ON public.spaces TO anon;

GRANT ALL ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

GRANT ALL ON public.space_authorized_users TO authenticated;
GRANT SELECT ON public.space_authorized_users TO anon; 