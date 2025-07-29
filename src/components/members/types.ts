export interface Member {
  id: string
  email: string
  auth_email?: string // The actual auth email (for invited users who haven't completed profile)
  first_name?: string
  last_name?: string
  avatar_url?: string
  bio?: string
  reputation_points: number
  created_at: string
  updated_at: string
  // Role information
  global_role?: {
    id: string
    name: string
    level: number
    description?: string
    is_system_role?: boolean
  }
  // Space permissions
  space_permissions?: SpacePermission[]
}

export interface SpacePermission {
  space_id: string
  space_name: string
  space_description?: string | null // Allow null to match database
  has_access: boolean
  role?: {
    id: string
    name: string
    level: number
  }
}

export interface InviteRequest {
  id: string
  email: string
  message?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface PendingInvite {
  id: string
  email: string
  invited_by: string
  invited_by_name?: string
  status: 'pending' | 'accepted'
  created_at: string
  expires_at?: string
}

export interface Role {
  id: string
  name: string
  description?: string
  level: number
  is_custom?: boolean
  created_at?: string
}

export type TabType = 'members' | 'invites' 