-- =============================================
-- ZOCALO INITIAL SETUP SQL
-- Complete database schema for first deployment
-- Consolidated from all migration files
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CREATE CUSTOM TYPES
-- =============================================

-- Role level enum
DO $$ BEGIN
    CREATE TYPE role_level AS ENUM ('1', '2', '3', '4');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Settings scope enum
DO $$ BEGIN
    CREATE TYPE setting_scope AS ENUM ('global', 'space', 'user', 'organization');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Invite request status enum
DO $$ BEGIN
    CREATE TYPE invite_request_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Message type enum
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM (
        'text',
        'markdown', 
        'audio',
        'video',
        'image',
        'file',
        'poll',
        'vote',
        'system',
        'announcement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Activity type enum
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'channel_created',
        'channel_updated', 
        'channel_deleted',
        'message_posted',
        'message_edited',
        'message_deleted',
        'event_created',
        'event_updated',
        'event_deleted',
        'file_uploaded',
        'file_deleted',
        'entity_created',
        'entity_updated',
        'entity_deleted',
        'comment_created',
        'comment_updated',
        'comment_deleted',
        'member_invited',
        'member_role_changed',
        'space_permission_granted',
        'space_permission_revoked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CREATE ALL TABLES
-- =============================================

-- PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 1 AND level <= 4),
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SPACES TABLE
CREATE TABLE IF NOT EXISTS public.spaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    minimum_role_level INTEGER CHECK (minimum_role_level >= 1 AND minimum_role_level <= 4),
    role_restriction UUID REFERENCES roles(id),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- USER_ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, space_id)
);

-- SPACE_AUTHORIZED_USERS TABLE
CREATE TABLE IF NOT EXISTS public.space_authorized_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(space_id, user_id)
);

-- SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    scope setting_scope NOT NULL DEFAULT 'global',
    scope_id UUID,
    description TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(key, scope, scope_id)
);

-- INVITE_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.invite_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    message TEXT,
    status invite_request_status DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    UNIQUE(email, status) DEFERRABLE INITIALLY DEFERRED
);

-- CHANNELS TABLE
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')) DEFAULT 'direct',
    name TEXT,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_message_at TIMESTAMP WITH TIME ZONE
);

-- CONVERSATION_PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(conversation_id, user_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    thread_count INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_edited BOOLEAN DEFAULT false,
    encryption_type TEXT DEFAULT 'none' CHECK (encryption_type IN ('none', 'instance_key', 'e2ee')),
    status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'deleted', 'pending_approval')),
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT message_context_check CHECK (
        (channel_id IS NOT NULL AND conversation_id IS NULL) OR
        (channel_id IS NULL AND conversation_id IS NOT NULL)
    )
);

-- MESSAGE_METADATA TABLE
CREATE TABLE IF NOT EXISTS public.message_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, key)
);

-- MESSAGE_REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- ENTITY_SCHEMAS TABLE
CREATE TABLE IF NOT EXISTS public.entity_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT '1.0.0',
    name TEXT NOT NULL,
    description TEXT,
    schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENTITIES TABLE
CREATE TABLE IF NOT EXISTS public.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    parent_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    parent_type TEXT,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'deleted', 'pending_approval', 'draft')),
    encryption_type TEXT DEFAULT 'none' CHECK (encryption_type IN ('none', 'instance_key', 'e2ee')),
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    edited_by UUID REFERENCES auth.users(id),
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    thread_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type activity_type NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    target_id UUID,
    target_type TEXT,
    target_name TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_space_id ON public.user_roles(space_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);

-- Spaces indexes
CREATE INDEX IF NOT EXISTS idx_spaces_created_by ON public.spaces(created_by);

-- Space authorized users indexes
CREATE INDEX IF NOT EXISTS idx_space_authorized_users_space_id ON public.space_authorized_users(space_id);
CREATE INDEX IF NOT EXISTS idx_space_authorized_users_user_id ON public.space_authorized_users(user_id);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_scope ON public.settings(scope);
CREATE INDEX IF NOT EXISTS idx_settings_scope_id ON public.settings(scope_id);
CREATE INDEX IF NOT EXISTS idx_settings_key_scope ON public.settings(key, scope, scope_id);

-- Invite requests indexes
CREATE INDEX IF NOT EXISTS idx_invite_requests_email ON public.invite_requests(email);
CREATE INDEX IF NOT EXISTS idx_invite_requests_status ON public.invite_requests(status);
CREATE INDEX IF NOT EXISTS idx_invite_requests_requested_at ON public.invite_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_invite_requests_expires_at ON public.invite_requests(expires_at);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_space_id ON public.channels(space_id);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS idx_channels_created_at ON public.channels(created_at);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_encryption_type ON public.messages(encryption_type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Metadata and reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_metadata_message_id ON public.message_metadata(message_id);
CREATE INDEX IF NOT EXISTS idx_message_metadata_key ON public.message_metadata(key);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Entity schemas indexes
CREATE INDEX IF NOT EXISTS idx_entity_schemas_type ON public.entity_schemas(type);
CREATE INDEX IF NOT EXISTS idx_entity_schemas_active ON public.entity_schemas(is_active);

-- Entities indexes
CREATE INDEX IF NOT EXISTS idx_entities_space_id ON public.entities(space_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_parent_id ON public.entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_status ON public.entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_created_by ON public.entities(created_by);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON public.entities(created_at);
CREATE INDEX IF NOT EXISTS idx_entities_last_activity ON public.entities(last_activity_at);

-- Activities indexes
CREATE INDEX IF NOT EXISTS activities_user_created_idx ON public.activities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_space_created_idx ON public.activities (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_type_created_idx ON public.activities (type, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_created_idx ON public.activities (created_at DESC);

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

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Function to auto-assign founder role when creating first space
CREATE OR REPLACE FUNCTION public.handle_space_creation()
RETURNS TRIGGER AS $$
DECLARE
    founder_role_id UUID;
BEGIN
    SELECT id INTO founder_role_id FROM public.roles WHERE name = 'founder';
    INSERT INTO public.user_roles (user_id, role_id, space_id, assigned_by)
    VALUES (NEW.created_by, founder_role_id, NEW.id, NEW.created_by);
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

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

-- Function to clean up expired invite requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
RETURNS void AS $$
BEGIN
    UPDATE public.invite_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ language 'plpgsql' security definer;

-- Function to automatically approve invite when public signup is enabled
CREATE OR REPLACE FUNCTION public.handle_invite_request()
RETURNS TRIGGER AS $$
DECLARE
    allow_signup BOOLEAN;
BEGIN
    SELECT (value::boolean) INTO allow_signup
    FROM public.settings 
    WHERE key = 'allow_public_signup' AND scope = 'global';
    
    IF allow_signup = true THEN
        NEW.status = 'approved';
        NEW.reviewed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Function to validate thread context
CREATE OR REPLACE FUNCTION public.validate_thread_context()
RETURNS TRIGGER AS $$
DECLARE
    parent_channel_id UUID;
    parent_conversation_id UUID;
BEGIN
    IF NEW.parent_message_id IS NOT NULL THEN
        SELECT channel_id, conversation_id 
        INTO parent_channel_id, parent_conversation_id
        FROM messages 
        WHERE id = NEW.parent_message_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent message does not exist';
        END IF;
        
        IF (NEW.channel_id IS NOT NULL AND NEW.channel_id != parent_channel_id) OR
           (NEW.conversation_id IS NOT NULL AND NEW.conversation_id != parent_conversation_id) THEN
            RAISE EXCEPTION 'Thread message must be in same context as parent message';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update thread counts
CREATE OR REPLACE FUNCTION public.update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET thread_count = thread_count + 1 
        WHERE id = NEW.parent_message_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET thread_count = GREATEST(0, thread_count - 1) 
        WHERE id = OLD.parent_message_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation last message timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update entities updated_at and thread counts
CREATE OR REPLACE FUNCTION public.update_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    IF NEW.parent_id IS NOT NULL THEN
        UPDATE entities 
        SET last_activity_at = NOW(),
            thread_count = COALESCE(thread_count, 0) + 1
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update entity schemas updated_at
CREATE OR REPLACE FUNCTION public.update_entity_schemas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic function to log activities
-- Fix 2: Update the log_activity function to ensure proper type casting
-- This function has parameter type issues that could cause the error
CREATE OR REPLACE FUNCTION public.log_activity(
    p_type activity_type,
    p_user_id UUID,
    p_space_id UUID,
    p_target_id UUID DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_target_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    INSERT INTO activities (
        type, user_id, space_id, target_id, target_type, target_name, description, metadata
    ) VALUES (
        p_type, p_user_id, p_space_id, p_target_id, p_target_type, p_target_name, p_description, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Channel activity trigger function
CREATE OR REPLACE FUNCTION public.trigger_channel_created() RETURNS trigger AS $$
BEGIN
    PERFORM log_activity(
        'channel_created'::activity_type,
        NEW.created_by,
        NEW.space_id,
        NEW.id,
        'channel',
        NEW.name,
        'Created channel "' || NEW.name || '"',
        jsonb_build_object('channel_description', NEW.description, 'is_private', NEW.is_private)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Message activity trigger function
CREATE OR REPLACE FUNCTION public.trigger_message_posted() RETURNS trigger AS $$
DECLARE
    space_id_val UUID;
    channel_name TEXT;
    activity_desc TEXT;
BEGIN
    IF NEW.channel_id IS NOT NULL THEN
        SELECT c.space_id, c.name INTO space_id_val, channel_name
        FROM channels c WHERE c.id = NEW.channel_id;
        activity_desc := 'Posted message in #' || channel_name;
    ELSE
        space_id_val := NULL;
        activity_desc := 'Posted message in conversation';
    END IF;
    
    PERFORM log_activity(
        'message_posted'::activity_type,
        NEW.user_id,
        space_id_val,
        NEW.id,
        'message',
        LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
        activity_desc,
        jsonb_build_object('message_type', NEW.message_type, 'channel_id', NEW.channel_id, 'conversation_id', NEW.conversation_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Message edited trigger function
CREATE OR REPLACE FUNCTION public.trigger_message_edited() RETURNS trigger AS $$
DECLARE
    space_id_val UUID;
    channel_name TEXT;
    activity_desc TEXT;
BEGIN
    IF OLD.content != NEW.content AND NEW.edited_at IS NOT NULL AND OLD.edited_at IS DISTINCT FROM NEW.edited_at THEN
        IF NEW.channel_id IS NOT NULL THEN
            SELECT c.space_id, c.name INTO space_id_val, channel_name
            FROM channels c WHERE c.id = NEW.channel_id;
            activity_desc := 'Edited message in #' || channel_name;
        ELSE
            space_id_val := NULL;
            activity_desc := 'Edited message in conversation';
        END IF;
        
        PERFORM log_activity(
            'message_edited'::activity_type,
            NEW.user_id,
            space_id_val,
            NEW.id,
            'message',
            LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
            activity_desc,
            jsonb_build_object('message_type', NEW.message_type, 'channel_id', NEW.channel_id, 'conversation_id', NEW.conversation_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Entity activity trigger functions
-- Fix 3: Update the trigger_entity_created function to handle the entity_content issue
CREATE OR REPLACE FUNCTION public.trigger_entity_created() RETURNS trigger AS $$
DECLARE
    activity_desc TEXT;
    entity_display_name TEXT;
    entity_content JSONB;
BEGIN
    -- Skip activity logging for anonymous entities (preserves anonymity)
    IF NEW.created_by IS NULL THEN
        RETURN NEW;
    END IF;

    -- Make sure to properly handle the content conversion to JSONB
    -- Only try to convert to JSONB if it's not NULL
    IF NEW.content IS NOT NULL THEN
        BEGIN
            entity_content := NEW.content::jsonb;
        EXCEPTION WHEN others THEN
            entity_content := '{}'::jsonb;
        END;
    ELSE
        entity_content := '{}'::jsonb;
    END IF;

    entity_display_name := COALESCE(NEW.title, entity_content->>'file_name', 'Untitled');
    
    CASE NEW.type
        WHEN 'event' THEN
            activity_desc := 'Created event "' || entity_display_name || '"';
        WHEN 'file' THEN
            activity_desc := 'Uploaded file "' || entity_display_name || '"';
        WHEN 'folder' THEN
            activity_desc := 'Created folder "' || entity_display_name || '"';
        WHEN 'comment' THEN
            activity_desc := 'Posted comment';
        WHEN 'vote' THEN
            activity_desc := 'Created poll "' || entity_display_name || '"';
        WHEN 'vote_submission' THEN
            RETURN NEW; -- Don't log individual vote submissions
        ELSE
            activity_desc := 'Created ' || NEW.type || ' "' || entity_display_name || '"';
    END CASE;
    
    PERFORM log_activity(
        'entity_created'::activity_type,
        NEW.created_by,
        NEW.space_id,
        NEW.id,
        NEW.type,
        entity_display_name,
        activity_desc,
        jsonb_build_object(
            'entity_type', NEW.type,
            'parent_id', NEW.parent_id,
            'parent_type', NEW.parent_type,
            'content_preview', LEFT(COALESCE(NEW.content, ''), 100)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Space permission activity trigger functions
CREATE OR REPLACE FUNCTION public.trigger_space_permission_granted() RETURNS trigger AS $$
DECLARE
    space_name TEXT;
    user_name TEXT;
    activity_desc TEXT;
BEGIN
    SELECT s.name INTO space_name FROM spaces s WHERE s.id = NEW.space_id;
    SELECT COALESCE(p.first_name || ' ' || p.last_name, 'User') INTO user_name 
    FROM profiles p 
    WHERE p.id = NEW.user_id;
    
    activity_desc := 'Granted access to ' || COALESCE(user_name, 'user') || ' for space "' || COALESCE(space_name, 'Unknown') || '"';
    
    PERFORM log_activity(
        'space_permission_granted'::activity_type,
        COALESCE(NEW.authorized_by, NEW.user_id),
        NEW.space_id,
        NEW.user_id,
        'user',
        user_name,
        activity_desc,
        jsonb_build_object('space_name', space_name)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_space_permission_revoked() RETURNS trigger AS $$
DECLARE
    space_name TEXT;
    user_name TEXT;
    activity_desc TEXT;
    revoker_id UUID;
BEGIN
    SELECT s.name INTO space_name FROM spaces s WHERE s.id = OLD.space_id;
    SELECT COALESCE(p.first_name || ' ' || p.last_name, 'User') INTO user_name 
    FROM profiles p 
    WHERE p.id = OLD.user_id;
    
    revoker_id := auth.uid();
    activity_desc := 'Revoked access from ' || COALESCE(user_name, 'user') || ' for space "' || COALESCE(space_name, 'Unknown') || '"';
    
    PERFORM log_activity(
        'space_permission_revoked'::activity_type,
        COALESCE(revoker_id, OLD.user_id),
        OLD.space_id,
        OLD.user_id,
        'user',
        user_name,
        activity_desc,
        jsonb_build_object('space_name', space_name)
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS handle_updated_at_profiles ON public.profiles;
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_spaces ON public.spaces;
CREATE TRIGGER handle_updated_at_spaces
    BEFORE UPDATE ON public.spaces
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_settings ON public.settings;
CREATE TRIGGER handle_updated_at_settings
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON public.channels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_update_entities_updated_at ON public.entities;
CREATE TRIGGER trigger_update_entities_updated_at
    BEFORE UPDATE ON public.entities
    FOR EACH ROW EXECUTE FUNCTION public.update_entities_updated_at();

DROP TRIGGER IF EXISTS trigger_update_entity_schemas_updated_at ON public.entity_schemas;
CREATE TRIGGER trigger_update_entity_schemas_updated_at
    BEFORE UPDATE ON public.entity_schemas
    FOR EACH ROW EXECUTE FUNCTION public.update_entity_schemas_updated_at();

-- User management triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_space_created ON public.spaces;
CREATE TRIGGER on_space_created
    AFTER INSERT ON public.spaces
    FOR EACH ROW EXECUTE PROCEDURE public.handle_space_creation();

DROP TRIGGER IF EXISTS on_invite_request_created ON public.invite_requests;
CREATE TRIGGER on_invite_request_created
    BEFORE INSERT ON public.invite_requests
    FOR EACH ROW EXECUTE PROCEDURE public.handle_invite_request();

-- Message management triggers
DROP TRIGGER IF EXISTS validate_message_thread_context ON public.messages;
CREATE TRIGGER validate_message_thread_context
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.validate_thread_context();

DROP TRIGGER IF EXISTS update_message_thread_count ON public.messages;
CREATE TRIGGER update_message_thread_count
    AFTER INSERT OR DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_thread_count();

DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON public.messages;
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    WHEN (NEW.conversation_id IS NOT NULL)
    EXECUTE FUNCTION public.update_conversation_last_message();

-- Activity logging triggers
DROP TRIGGER IF EXISTS channel_created_trigger ON public.channels;
CREATE TRIGGER channel_created_trigger
    AFTER INSERT ON public.channels
    FOR EACH ROW EXECUTE FUNCTION public.trigger_channel_created();

DROP TRIGGER IF EXISTS message_posted_trigger ON public.messages;
CREATE TRIGGER message_posted_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.trigger_message_posted();

DROP TRIGGER IF EXISTS message_edited_trigger ON public.messages;
CREATE TRIGGER message_edited_trigger
    AFTER UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.trigger_message_edited();

DROP TRIGGER IF EXISTS entity_created_trigger ON public.entities;
CREATE TRIGGER entity_created_trigger
    AFTER INSERT ON public.entities
    FOR EACH ROW EXECUTE FUNCTION public.trigger_entity_created();

DROP TRIGGER IF EXISTS space_permission_granted_trigger ON public.space_authorized_users;
CREATE TRIGGER space_permission_granted_trigger
    AFTER INSERT ON public.space_authorized_users
    FOR EACH ROW EXECUTE FUNCTION public.trigger_space_permission_granted();

DROP TRIGGER IF EXISTS space_permission_revoked_trigger ON public.space_authorized_users;
CREATE TRIGGER space_permission_revoked_trigger
    AFTER DELETE ON public.space_authorized_users
    FOR EACH ROW EXECUTE FUNCTION public.trigger_space_permission_revoked();

-- =============================================
-- RLS POLICIES (SIMPLIFIED TO AVOID RECURSION)
-- =============================================

-- Drop all existing policies to allow re-running the script
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "All authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can create roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated users can delete custom roles" ON public.roles;

DROP POLICY IF EXISTS "All authenticated users can view spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated users can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Space creators can update their spaces" ON public.spaces;
DROP POLICY IF EXISTS "Space creators can delete their spaces" ON public.spaces;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Space creators can manage roles" ON public.user_roles;

DROP POLICY IF EXISTS "Authorized users are viewable by space members" ON public.space_authorized_users;
DROP POLICY IF EXISTS "Admins can authorize users" ON public.space_authorized_users;
DROP POLICY IF EXISTS "Admins can remove authorized users" ON public.space_authorized_users;

DROP POLICY IF EXISTS "Allow public global settings access" ON public.settings;
DROP POLICY IF EXISTS "Users can access their own settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;

DROP POLICY IF EXISTS "Users can view their own invite requests" ON public.invite_requests;
DROP POLICY IF EXISTS "Anyone can create invite requests" ON public.invite_requests;
DROP POLICY IF EXISTS "Authenticated users can view invite requests" ON public.invite_requests;
DROP POLICY IF EXISTS "Authenticated users can update invite requests" ON public.invite_requests;

DROP POLICY IF EXISTS "All authenticated users can view channels" ON public.channels;
DROP POLICY IF EXISTS "Authenticated users can create channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can update their channels" ON public.channels;
DROP POLICY IF EXISTS "Channel creators can delete their channels" ON public.channels;

DROP POLICY IF EXISTS "All authenticated users can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creators can update their conversations" ON public.conversations;

DROP POLICY IF EXISTS "All authenticated users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can manage conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;

DROP POLICY IF EXISTS "All authenticated users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

DROP POLICY IF EXISTS "All authenticated users can view message metadata" ON public.message_metadata;
DROP POLICY IF EXISTS "Authenticated users can create message metadata" ON public.message_metadata;

DROP POLICY IF EXISTS "All authenticated users can view message reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can create their own message reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can update their own message reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their own message reactions" ON public.message_reactions;

DROP POLICY IF EXISTS "Users can view active entity schemas" ON public.entity_schemas;
DROP POLICY IF EXISTS "Authenticated users can create entity schemas" ON public.entity_schemas;
DROP POLICY IF EXISTS "Schema creators can update their schemas" ON public.entity_schemas;

DROP POLICY IF EXISTS "Users can view entities in accessible spaces" ON public.entities;
DROP POLICY IF EXISTS "Users can create entities in accessible spaces" ON public.entities;
DROP POLICY IF EXISTS "Entity creators can update their entities" ON public.entities;

DROP POLICY IF EXISTS "Users can view activities for authorized spaces" ON public.activities;
DROP POLICY IF EXISTS "System can insert activities" ON public.activities;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Roles policies (simplified)
CREATE POLICY "All authenticated users can view roles" ON public.roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create roles" ON public.roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update roles" ON public.roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete custom roles" ON public.roles
    FOR DELETE USING (auth.uid() IS NOT NULL AND is_custom = true);

-- Spaces policies (simplified)
CREATE POLICY "All authenticated users can view spaces" ON public.spaces
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create spaces" ON public.spaces
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Space creators can update their spaces" ON public.spaces
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Space creators can delete their spaces" ON public.spaces
    FOR DELETE USING (created_by = auth.uid());

-- User roles policies (simplified)
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view user roles" ON public.user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Space creators can manage roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.spaces s
            WHERE s.id = user_roles.space_id 
            AND s.created_by = auth.uid()
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
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can remove authorized users" ON public.space_authorized_users
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Settings policies (simplified)
CREATE POLICY "Allow public global settings access" ON public.settings
    FOR SELECT USING (scope = 'global' AND is_public = true);

CREATE POLICY "Users can access their own settings" ON public.settings
    FOR ALL USING (scope = 'user' AND scope_id = auth.uid());

CREATE POLICY "Authenticated users can insert settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Invite requests policies
CREATE POLICY "Users can view their own invite requests" ON public.invite_requests
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Anyone can create invite requests" ON public.invite_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view invite requests" ON public.invite_requests
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invite requests" ON public.invite_requests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Messaging system policies (simplified)
CREATE POLICY "All authenticated users can view channels" ON public.channels
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create channels" ON public.channels
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Channel creators can update their channels" ON public.channels
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Channel creators can delete their channels" ON public.channels
    FOR DELETE USING (created_by = auth.uid());

CREATE POLICY "All authenticated users can view conversations" ON public.conversations
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Conversation creators can update their conversations" ON public.conversations
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "All authenticated users can view conversation participants" ON public.conversation_participants
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage conversation participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "All authenticated users can view messages" ON public.messages
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create messages" ON public.messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "All authenticated users can view message metadata" ON public.message_metadata
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create message metadata" ON public.message_metadata
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view message reactions" ON public.message_reactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own message reactions" ON public.message_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message reactions" ON public.message_reactions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own message reactions" ON public.message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Entity system policies
CREATE POLICY "Users can view active entity schemas" ON public.entity_schemas
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create entity schemas" ON public.entity_schemas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Schema creators can update their schemas" ON public.entity_schemas
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can view entities in accessible spaces" ON public.entities
    FOR SELECT USING (
        status IN ('approved', 'deleted') AND
        space_id IN (
            SELECT s.id FROM spaces s
            LEFT JOIN space_authorized_users sau ON s.id = sau.space_id
            WHERE sau.user_id = auth.uid() OR s.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create entities in accessible spaces" ON public.entities
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        space_id IN (
            SELECT s.id FROM spaces s
            LEFT JOIN space_authorized_users sau ON s.id = sau.space_id
            WHERE sau.user_id = auth.uid() OR s.created_by = auth.uid()
        )
    );

CREATE POLICY "Entity creators can update their entities" ON public.entities
    FOR UPDATE USING (created_by = auth.uid());

-- Activities policies
CREATE POLICY "Users can view activities for authorized spaces" ON public.activities
    FOR SELECT USING (
        space_id IS NULL OR
        EXISTS (
            SELECT 1 FROM space_authorized_users sau 
            WHERE sau.space_id = activities.space_id 
            AND sau.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert activities" ON public.activities
    FOR INSERT WITH CHECK (true);

-- =============================================
-- STORAGE SETUP
-- =============================================
-- Note: Storage setup moved to separate file due to permission requirements
-- Run storage_setup.sql after this file with appropriate permissions


-- =============================================
-- SEED DATA
-- =============================================

-- Default roles
INSERT INTO public.roles (name, description, level, is_custom) VALUES
    ('founder', 'Full system access, can manage everything including spaces and users', 4, false),
    ('admin', 'Space management, user management, and content oversight', 3, false),
    ('editor', 'Content creation, editing, and moderate user management', 2, false),
    ('viewer', 'Read-only access to content within authorized spaces', 1, false)
ON CONFLICT (name) DO NOTHING;

-- Initial global settings
INSERT INTO public.settings (key, value, scope, description, is_public) VALUES
    ('instance_name', '"Zocalo Instance"', 'global', 'Name of this Zocalo instance', true),
    ('instance_domain', '""', 'global', 'Domain where this instance is hosted', true),
    ('allow_public_signup', 'true', 'global', 'Whether users can sign up without invitation', true),
    ('require_email_confirmation', 'true', 'global', 'Whether email confirmation is required for new users', true),
    ('setup_completed', 'false', 'global', 'Whether initial setup has been completed', false),
    ('max_spaces_per_user', '10', 'global', 'Maximum number of spaces a user can create', false),
    ('default_user_role', '"viewer"', 'global', 'Default role assigned to new users', false),
    ('encrypt_messages', '"instance_key"', 'global', 'Message encryption setting', false)
ON CONFLICT (key, scope, scope_id) DO NOTHING;

-- Entity schemas
INSERT INTO public.entity_schemas (type, name, description, schema, created_by) VALUES
('event', 'Event', 'Calendar events with date, time, location and participants', '{
  "type": "object",
  "properties": {
    "event_start": {"type": "string", "format": "date-time"},
    "event_end": {"type": "string", "format": "date-time"},
    "event_location": {"type": "string"},
    "event_link": {"type": "string", "format": "uri"},
    "participants": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  },
  "required": ["event_start"]
}', NULL),

('file', 'File', 'File storage with folder organization', '{
  "type": "object",
  "properties": {
    "file_url": {"type": "string", "format": "uri"},
    "file_name": {"type": "string"},
    "file_type": {"type": "string"},
    "file_size": {"type": "number"},
    "upload_path": {"type": "string"},
    "original_name": {"type": "string"}
  },
  "required": ["file_name", "file_type"]
}', NULL),

('folder', 'Folder', 'Folder for organizing files', '{
  "type": "object",
  "properties": {},
  "required": []
}', NULL),

('vote', 'Vote/Poll', 'Voting and polling system', '{
  "type": "object",
  "required": ["vote_options"],
  "properties": {
    "vote_options": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "vote_deadline": {
      "type": "string",
      "format": "date-time"
    },
    "vote_anonymous": {
      "type": "boolean",
      "default": false
    },
    "max_votes_per_user": {
      "type": "integer",
      "default": 1,
      "minimum": 1,
      "description": "Total number of votes a user can cast across all options"
    },
    "vote_multiple_choice": {
      "type": "boolean",
      "default": false
    },
    "vote_scoring_enabled": {
      "type": "boolean",
      "default": false,
      "description": "Whether users can assign a score to options instead of a single vote"
    },
    "vote_result_visibility": {
      "enum": [
        "always_visible",
        "after_deadline",
        "never"
      ],
      "type": "string",
      "default": "always_visible",
      "description": "When the vote results are visible"
    },
    "allow_multiple_votes_per_option": {
      "type": "boolean",
      "default": false,
      "description": "Whether a user can allocate more than one vote to the same option"
    }
  }
}', NULL),

('vote_submission', 'Vote Submission', 'Individual vote submissions for tracking user votes', '{
  "type": "object",
  "required": [
    "vote_id",
    "choice_index", 
    "timestamp"
  ],
  "properties": {
    "vote_id": {
      "type": "string",
      "format": "uuid"
    },
    "choice_index": {
      "type": "integer",
      "description": "Index of the selected vote option"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "score": {
      "type": "number",
      "description": "Optional score given to the option, required if vote_scoring_enabled"
    },
    "user_id_hash": {
      "type": "string",
      "description": "Hash of the user ID for anonymous voting"
    }
  }
}', NULL),

('comment', 'Comment', 'Comments and replies on entities', '{
  "type": "object",
  "properties": {
    "content": {"type": "string"}
  },
  "required": ["content"]
}', NULL),

-- Projects app schemas
('project', 'Project', 'Project container for organizing tasks in kanban boards', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "status": {
      "type": "string", 
      "enum": ["planning", "active", "completed", "archived"],
      "default": "planning"
    },
    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
    "deadline": {"type": "string", "format": "date-time"},
    "team_members": {"type": "array", "items": {"type": "string"}},
    "settings": {
      "type": "object",
      "properties": {
        "allow_comments": {"type": "boolean", "default": true},
        "allow_attachments": {"type": "boolean", "default": true},
        "visibility": {"type": "string", "enum": ["private", "team", "public"], "default": "team"}
      }
    }
  }
}', NULL),

('project_list', 'Project List', 'Kanban columns for organizing tasks within projects', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "position": {"type": "number", "required": true},
    "project_id": {"type": "string", "required": true},
    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
    "list_type": {
      "type": "string",
      "enum": ["todo", "in_progress", "review", "done", "custom"],
      "default": "custom"
    },
    "settings": {
      "type": "object",
      "properties": {
        "task_limit": {"type": "number"},
        "auto_archive": {"type": "boolean", "default": false},
        "collapsed": {"type": "boolean", "default": false}
      }
    }
  }
}', NULL),

('project_task', 'Project Task', 'Individual tasks that can be organized in lists or nested under other tasks', '{
  "type": "object",
  "properties": {
    "title": {"type": "string", "required": true},
    "description": {"type": "string"},
    "status": {
      "type": "string",
      "enum": ["todo", "in_progress", "review", "done", "blocked"],
      "default": "todo"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "urgent"],
      "default": "medium"
    },
    "assignee_id": {"type": "string"},
    "assignee_name": {"type": "string"},
    "due_date": {"type": "string", "format": "date-time"},
    "start_date": {"type": "string", "format": "date-time"},
    "estimated_hours": {"type": "number"},
    "actual_hours": {"type": "number"},
    "position": {"type": "number", "required": true},
    "project_id": {"type": "string", "required": true},
    "list_id": {"type": "string"},
    "labels": {"type": "array", "items": {"type": "string"}},
    "checklist": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "text": {"type": "string"},
          "completed": {"type": "boolean", "default": false}
        }
      }
    },
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "url": {"type": "string"},
          "type": {"type": "string"}
        }
      }
    }
  }
}', NULL)
ON CONFLICT (type) DO NOTHING;

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

GRANT ALL ON public.settings TO authenticated;
GRANT SELECT ON public.settings TO anon;

GRANT ALL ON public.invite_requests TO authenticated;
GRANT SELECT, INSERT ON public.invite_requests TO anon;

GRANT ALL ON public.channels TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_metadata TO authenticated;
GRANT ALL ON public.message_reactions TO authenticated;

GRANT ALL ON public.entity_schemas TO authenticated;
GRANT ALL ON public.entities TO authenticated;
GRANT ALL ON public.activities TO authenticated;

-- Storage permissions handled in separate storage_setup.sql file

-- =============================================
-- SETUP COMPLETE
-- =============================================

COMMENT ON DATABASE postgres IS 'Zocalo initial setup completed - all tables, functions, triggers, and policies created';
