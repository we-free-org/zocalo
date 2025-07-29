import { supabase } from '@/lib/supabase/client'

export interface ProfileStatus {
  isComplete: boolean
  hasProfile: boolean
  hasRoles: boolean
  hasSpaceAccess: boolean
  needsCompletion: boolean
}

/**
 * Check if a user's profile is complete and properly configured
 */
export async function checkProfileCompleteness(userId: string): Promise<ProfileStatus> {
  try {
    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError)
      throw profileError
    }

    const hasProfile = !!profile && !!profile.first_name && !!profile.last_name

    // Check if user has any roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, role_id, space_id')
      .eq('user_id', userId)

    if (rolesError) {
      console.error('Error checking user roles:', rolesError)
      throw rolesError
    }

    const hasRoles = userRoles && userRoles.length > 0

    // Check if user has space access
    const { data: spaceAccess, error: spaceError } = await supabase
      .from('space_authorized_users')
      .select('id, space_id')
      .eq('user_id', userId)

    if (spaceError) {
      console.error('Error checking space access:', spaceError)
      throw spaceError
    }

    const hasSpaceAccess = spaceAccess && spaceAccess.length > 0

    const isComplete = hasProfile && hasRoles && hasSpaceAccess
    const needsCompletion = !isComplete

    return {
      isComplete,
      hasProfile,
      hasRoles,
      hasSpaceAccess,
      needsCompletion
    }
  } catch (error) {
    console.error('Failed to check profile completeness:', error)
    throw error
  }
}

/**
 * Check if the current authenticated user needs to complete their profile
 */
export async function checkCurrentUserProfileCompletion(): Promise<ProfileStatus | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    return await checkProfileCompleteness(user.id)
  } catch (error) {
    console.error('Failed to check current user profile:', error)
    return null
  }
}

/**
 * Redirect to profile completion if needed
 */
export function shouldRedirectToProfileCompletion(profileStatus: ProfileStatus | null): boolean {
  return profileStatus?.needsCompletion === true
} 