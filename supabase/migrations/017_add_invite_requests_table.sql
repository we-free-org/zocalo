-- =============================================
-- INVITE REQUESTS TABLE
-- =============================================

-- Create invite_requests table for people requesting access
CREATE TABLE invite_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE invite_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create invite requests"
  ON invite_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all invite requests"
  ON invite_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level >= 3 -- Admin level or higher
    )
  );

CREATE POLICY "Admins can update invite requests"
  ON invite_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.level >= 3 -- Admin level or higher
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invite_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invite_requests_updated_at
  BEFORE UPDATE ON invite_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_invite_requests_updated_at();

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_invite_requests_status ON invite_requests(status);
CREATE INDEX idx_invite_requests_email ON invite_requests(email);
CREATE INDEX idx_invite_requests_created_at ON invite_requests(created_at DESC); 