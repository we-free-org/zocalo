import { types, flow, Instance } from 'mobx-state-tree'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// Space model - matches database schema
export const Space = types.model('Space', {
  id: types.identifier,
  name: types.string,
  description: types.maybeNull(types.string),
  minimum_role_level: types.maybeNull(types.number),
  created_by: types.maybeNull(types.string),
  created_at: types.string,
  updated_at: types.string,
})

// Profile model - must match database schema
export const Profile = types.model('Profile', {
  id: types.identifier,
  first_name: types.maybeNull(types.string),
  last_name: types.maybeNull(types.string),
  avatar_url: types.maybeNull(types.string),
  bio: types.maybeNull(types.string),
  reputation_points: types.optional(types.number, 0),
  created_at: types.string,
  updated_at: types.string,
})

// User store - minimal implementation
export const UserStore = types
  .model('UserStore', {
    user: types.maybeNull(types.frozen<User>()),
    session: types.maybeNull(types.frozen<Session>()),
    profile: types.maybeNull(Profile),

    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .views(self => ({
    get isAuthenticated() {
      return !!self.session && !!self.user
    },
    get hasProfile() {
      return !!self.profile
    },

    get displayName() {
      if (!self.profile) return self.user?.email || 'User'
      const { first_name, last_name } = self.profile
      if (first_name && last_name) return `${first_name} ${last_name}`
      if (first_name) return first_name
      if (last_name) return last_name
      return self.user?.email || 'User'
    },
    get userEmail() {
      return self.user?.email || ''
    },
  }))
  .actions(self => ({
    // Check current session (called manually)
    checkSession: flow(function* () {
      try {
        console.log('UserStore: Checking session...')
        self.isLoading = true
        const { data: { session } } = yield supabase.auth.getSession()
        
        if (session) {
          console.log('UserStore: Session found:', session.user?.email)
          self.session = session
          self.user = session.user
        } else {
          console.log('UserStore: No session found')
          self.session = null
          self.user = null
          self.profile = null
        }
      } catch (error) {
        console.error('UserStore: Failed to check session:', error)
        self.error = error instanceof Error ? error.message : 'Failed to check session'
      } finally {
        self.isLoading = false
      }
    }),

    // Load user data (called manually when needed)
    loadUserData: flow(function* () {
      if (!self.user?.id) return
      
      try {
        console.log('UserStore: Loading user data for:', self.user.id)
        self.isLoading = true
        
        // Load profile
        const { data: profileData, error: profileError } = yield supabase
          .from('profiles')
          .select('*')
          .eq('id', self.user.id)
          .single()
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('UserStore: Profile error:', profileError)
        } else if (profileData) {
          console.log('UserStore: Profile loaded:', profileData.first_name, profileData.last_name)
          self.profile = profileData
        }
        
        // Note: Spaces are now managed by SpaceStore
        // This keeps UserStore focused on user data only
      } catch (error) {
        console.error('UserStore: Failed to load user data:', error)
        self.error = error instanceof Error ? error.message : 'Failed to load user data'
      } finally {
        self.isLoading = false
      }
    }),

    // Sign out (redirect handled in component)
    signOut: flow(function* () {
      try {
        console.log('UserStore: Signing out...')
        yield supabase.auth.signOut()
        self.user = null
        self.session = null
        self.profile = null
        self.error = null
      } catch (error) {
        console.error('UserStore: Failed to sign out:', error)
        self.error = error instanceof Error ? error.message : 'Failed to sign out'
      }
    }),



    // Clear error
    clearError() {
      self.error = null
    },
  }))

export interface IUserStore extends Instance<typeof UserStore> {} 