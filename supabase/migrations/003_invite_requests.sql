-- =============================================
-- INVITE_REQUESTS TABLE
-- =============================================

-- Create invite request status enum
CREATE TYPE invite_request_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Create invite requests table
CREATE TABLE public.invite_requests (
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
    
    -- Prevent duplicate pending requests
    UNIQUE(email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Add RLS
ALTER TABLE public.invite_requests ENABLE ROW LEVEL SECURITY;

-- Invite requests policies
CREATE POLICY "Users can view their own invite requests" ON public.invite_requests
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Anyone can create invite requests" ON public.invite_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all invite requests" ON public.invite_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 3
        )
    );

CREATE POLICY "Admins can update invite requests" ON public.invite_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level >= 3
        )
    );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_invite_requests_email ON public.invite_requests(email);
CREATE INDEX idx_invite_requests_status ON public.invite_requests(status);
CREATE INDEX idx_invite_requests_requested_at ON public.invite_requests(requested_at);
CREATE INDEX idx_invite_requests_expires_at ON public.invite_requests(expires_at);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

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
    -- Check if public signup is allowed
    SELECT (value::boolean) INTO allow_signup
    FROM public.settings 
    WHERE key = 'allow_public_signup' AND scope = 'global';
    
    -- If public signup is allowed, auto-approve
    IF allow_signup = true THEN
        NEW.status = 'approved';
        NEW.reviewed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to handle invite request processing
CREATE TRIGGER on_invite_request_created
    BEFORE INSERT ON public.invite_requests
    FOR EACH ROW EXECUTE PROCEDURE public.handle_invite_request();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON public.invite_requests TO authenticated;
GRANT SELECT, INSERT ON public.invite_requests TO anon; 