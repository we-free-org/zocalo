-- =============================================
-- SETTINGS TABLE
-- =============================================

-- Create settings scope enum
CREATE TYPE setting_scope AS ENUM ('global', 'space', 'user', 'organization');

-- Create settings table
CREATE TABLE public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    scope setting_scope NOT NULL DEFAULT 'global',
    scope_id UUID, -- references the ID of the scoped entity (space_id, user_id, etc.)
    description TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL, -- whether setting is visible to non-admins
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure unique settings per scope
    UNIQUE(key, scope, scope_id)
);

-- Add RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Settings policies
CREATE POLICY "Public settings are viewable by everyone" ON public.settings
    FOR SELECT USING (scope = 'global' AND is_public = true);

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

CREATE POLICY "Authenticated users can insert settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_settings_key ON public.settings(key);
CREATE INDEX idx_settings_scope ON public.settings(scope);
CREATE INDEX idx_settings_scope_id ON public.settings(scope_id);
CREATE INDEX idx_settings_key_scope ON public.settings(key, scope, scope_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at_settings
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to get setting value
CREATE OR REPLACE FUNCTION public.get_setting(
    setting_key VARCHAR(255),
    setting_scope setting_scope DEFAULT 'global',
    setting_scope_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT value INTO setting_value
    FROM public.settings
    WHERE key = setting_key 
    AND scope = setting_scope 
    AND (scope_id = setting_scope_id OR (scope_id IS NULL AND setting_scope_id IS NULL));
    
    RETURN setting_value;
END;
$$ language 'plpgsql' security definer;

-- Function to set setting value
CREATE OR REPLACE FUNCTION public.set_setting(
    setting_key VARCHAR(255),
    setting_value JSONB,
    setting_scope setting_scope DEFAULT 'global',
    setting_scope_id UUID DEFAULT NULL,
    setting_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    setting_id UUID;
BEGIN
    INSERT INTO public.settings (key, value, scope, scope_id, description, created_by)
    VALUES (setting_key, setting_value, setting_scope, setting_scope_id, setting_description, auth.uid())
    ON CONFLICT (key, scope, scope_id)
    DO UPDATE SET 
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, settings.description),
        updated_at = NOW()
    RETURNING id INTO setting_id;
    
    RETURN setting_id;
END;
$$ language 'plpgsql' security definer;

-- =============================================
-- SEED INITIAL GLOBAL SETTINGS
-- =============================================
INSERT INTO public.settings (key, value, scope, description, is_public) VALUES
    ('instance_name', '"Zocalo Instance"', 'global', 'Name of this Zocalo instance', true),
    ('instance_domain', '""', 'global', 'Domain where this instance is hosted', true),
    ('allow_public_signup', 'true', 'global', 'Whether users can sign up without invitation', true),
    ('require_email_confirmation', 'true', 'global', 'Whether email confirmation is required for new users', true),
    ('setup_completed', 'false', 'global', 'Whether initial setup has been completed', false),
    ('max_spaces_per_user', '10', 'global', 'Maximum number of spaces a user can create', false),
    ('default_user_role', '"viewer"', 'global', 'Default role assigned to new users', false);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON public.settings TO authenticated;
GRANT SELECT ON public.settings TO anon; 