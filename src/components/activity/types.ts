export type ActivityType = 
  | 'channel_created'
  | 'channel_updated' 
  | 'channel_deleted'
  | 'message_posted'
  | 'message_edited'
  | 'message_deleted'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'file_uploaded'
  | 'file_deleted'
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'comment_created'
  | 'comment_updated'
  | 'comment_deleted'
  | 'member_invited'
  | 'member_role_changed'
  | 'space_permission_granted'
  | 'space_permission_revoked'

export interface Activity {
  id: string
  type: ActivityType
  user_id: string
  space_id?: string
  target_id?: string
  target_type?: string
  target_name?: string
  description: string
  metadata: Record<string, any>
  created_at: string
  
  // Joined data
  user?: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
  space?: {
    id: string
    name: string
    description?: string
  }
}

export interface ActivityFilter {
  space_id?: string | 'all'
  user_id?: string | 'all'
  activity_type?: ActivityType | 'all'
  date_from?: string
  date_to?: string
}

export interface ActivityListResponse {
  activities: Activity[]
  total_count: number
  has_more: boolean
  next_cursor?: string
}

export interface SpaceOption {
  id: string
  name: string
  description?: string
}

export interface UserOption {
  id: string
  email: string
  display_name: string
  avatar_url?: string
}

export type FilterType = 'spaces' | 'users'
export type TabType = 'spaces' | 'users' 