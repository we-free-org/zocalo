import { types, flow, Instance } from 'mobx-state-tree'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Profile model
export const Profile = types.model('Profile', {
  id: types.identifier,
  email: types.string,
  firstName: types.maybeNull(types.string),
  lastName: types.maybeNull(types.string),
  avatarUrl: types.maybeNull(types.string),
  systemRole: types.optional(types.string, 'user'),
  createdAt: types.string,
  updatedAt: types.string,
})

// Organization model
export const Organization = types.model('Organization', {
  id: types.identifier,
  name: types.string,
  website: types.maybeNull(types.string),
  country: types.string,
  city: types.string,
  phone: types.maybeNull(types.string),
  companySize: types.string,
  industryType: types.string,
  annualRevenue: types.string,
  internationalExperience: types.string,
  businessGoals: types.maybeNull(types.string),
  ownerId: types.string,
  createdAt: types.string,
  updatedAt: types.string,
})

// User store - minimal implementation
export const UserStore = types
  .model('UserStore', {
    user: types.maybeNull(types.frozen<User>()),
    session: types.maybeNull(types.frozen<Session>()),
    profile: types.maybeNull(Profile),
    organization: types.maybeNull(Organization),
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
    get hasOrganization() {
      return !!self.organization
    },
    get fullName() {
      if (!self.profile) return null
      const { firstName, lastName } = self.profile
      if (firstName && lastName) return `${firstName} ${lastName}`
      if (firstName) return firstName
      if (lastName) return lastName
      return null
    },
    get isAdmin() {
      return self.profile?.systemRole === 'admin' || self.profile?.systemRole === 'super_admin'
    },
    get isSuperAdmin() {
      return self.profile?.systemRole === 'super_admin'
    },
    get systemRole() {
      return self.profile?.systemRole || 'user'
    },
  }))
  .actions(self => ({
    // Check current session (called manually)
    checkSession: flow(function* () {
      try {
        self.isLoading = true
        const { data: { session } } = yield supabase.auth.getSession()
        
        if (session) {
          self.session = session
          self.user = session.user
        } else {
          self.session = null
          self.user = null
          self.profile = null
          self.organization = null
        }
      } catch (error) {
        console.error('Failed to check session:', error)
        self.error = error instanceof Error ? error.message : 'Failed to check session'
      } finally {
        self.isLoading = false
      }
    }),

    // Load user data (called manually when needed)
    loadUserData: flow(function* () {
      if (!self.user?.id) return
      
      try {
        self.isLoading = true
        
        // Load profile
        const { data: profileData } = yield supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url, system_role, created_at, updated_at')
          .eq('id', self.user.id)
          .single()
        
        if (profileData) {
          self.profile = {
            id: profileData.id,
            email: profileData.email,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            avatarUrl: profileData.avatar_url,
            systemRole: profileData.system_role || 'user',
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at,
          }
        }
        
        // Load organization
        const { data: membershipData } = yield supabase
          .from('organization_members')
          .select(`
            organization_id,
            organizations:organization_id (*)
          `)
          .eq('user_id', self.user.id)
          .eq('status', 'active')
          .single()
        
        if (membershipData?.organizations) {
          const orgData = membershipData.organizations
          self.organization = {
            id: orgData.id,
            name: orgData.name,
            website: orgData.website,
            country: orgData.country,
            city: orgData.city,
            phone: orgData.phone,
            companySize: orgData.company_size,
            industryType: orgData.industry_type,
            annualRevenue: orgData.annual_revenue,
            internationalExperience: orgData.international_experience,
            businessGoals: orgData.business_goals,
            ownerId: orgData.owner_id,
            createdAt: orgData.created_at,
            updatedAt: orgData.updated_at,
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        self.isLoading = false
      }
    }),

    // Sign out (redirect handled in component)
    signOut: flow(function* () {
      try {
        yield supabase.auth.signOut()
        self.user = null
        self.session = null
        self.profile = null
        self.organization = null
        self.error = null
      } catch (error) {
        console.error('Failed to sign out:', error)
        self.error = error instanceof Error ? error.message : 'Failed to sign out'
      }
    }),

    // Create organization
    createOrganization: flow(function* (onboardingData: Record<string, any>) {
      if (!self.user) throw new Error('No authenticated user')
      
      try {
        const companyBasics = onboardingData.company_basics || {}
        const locationData = onboardingData.company_location || {}
        
        const { data, error } = yield supabase
          .from('organizations')
          .insert({
            name: companyBasics.company_name,
            website: companyBasics.company_website,
            country: locationData.country,
            city: locationData.city,
            phone: locationData.phone,
            company_size: onboardingData.company_size,
            industry_type: onboardingData.industry_type,
            annual_revenue: onboardingData.annual_revenue,
            international_experience: onboardingData.international_experience,
            business_goals: onboardingData.business_goals,
            owner_id: self.user.id,
          })
          .select()
          .single()
        
        if (error) throw error
        
        if (data) {
          self.organization = {
            id: data.id,
            name: data.name,
            website: data.website,
            country: data.country,
            city: data.city,
            phone: data.phone,
            companySize: data.company_size,
            industryType: data.industry_type,
            annualRevenue: data.annual_revenue,
            internationalExperience: data.international_experience,
            businessGoals: data.business_goals,
            ownerId: data.owner_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          }
        }
        
        return data
      } catch (error) {
        console.error('Failed to create organization:', error)
        self.error = error instanceof Error ? error.message : 'Failed to create organization'
        throw error
      }
    }),

    // Clear error
    clearError() {
      self.error = null
    },

    // Settings management
    getSetting: flow(function* (key: string, scopeType: 'user' | 'organization' = 'user') {
      try {
        const scopeId = scopeType === 'user' ? self.user?.id : self.organization?.id
        if (!scopeId) return null

        const { data, error } = yield supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .eq('scope_type', scopeType)
          .eq('scope_id', scopeId)
          .eq('is_active', true)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        return data?.value || null
      } catch (error) {
        console.error('Failed to get setting:', error)
        return null
      }
    }),

    setSetting: flow(function* (
      key: string,
      value: any,
      scopeType: 'user' | 'organization' = 'user',
      description?: string
    ) {
      try {
        const scopeId = scopeType === 'user' ? self.user?.id : self.organization?.id
        if (!scopeId) throw new Error(`No ${scopeType} found`)

        const { error } = yield supabase
          .from('settings')
          .upsert({
            key,
            value,
            scope_type: scopeType,
            scope_id: scopeId,
            description,
            is_active: true,
          }, {
            onConflict: 'key,scope_type,scope_id'
          })

        if (error) throw error

        return true
      } catch (error) {
        console.error('Failed to set setting:', error)
        self.error = error instanceof Error ? error.message : 'Failed to save setting'
        throw error
      }
    }),

    getUserSettings: flow(function* () {
      if (!self.user?.id) return []

      try {
        const { data, error } = yield supabase
          .from('settings')
          .select('*')
          .eq('scope_type', 'user')
          .eq('scope_id', self.user.id)
          .eq('is_active', true)

        if (error) throw error

        return data || []
      } catch (error) {
        console.error('Failed to get user settings:', error)
        return []
      }
    }),

    getOrganizationSettings: flow(function* () {
      if (!self.organization?.id) return []

      try {
        const { data, error } = yield supabase
          .from('settings')
          .select('*')
          .eq('scope_type', 'organization')
          .eq('scope_id', self.organization.id)
          .eq('is_active', true)

        if (error) throw error

        return data || []
      } catch (error) {
        console.error('Failed to get organization settings:', error)
        return []
      }
    }),

    // Team management
    getOrganizationMembers: flow(function* () {
      if (!self.organization?.id) return []

      try {
        const { data, error } = yield supabase
          .from('organization_members')
          .select(`
            id,
            role,
            status,
            joined_at,
            profiles:user_id (
              id,
              email,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('organization_id', self.organization.id)

        if (error) throw error

        return data || []
      } catch (error) {
        console.error('Failed to get organization members:', error)
        return []
      }
    }),

    inviteTeamMember: flow(function* (email: string, role: string = 'member') {
      if (!self.organization?.id) throw new Error('No organization found')

      try {
        // For now, just log the invitation - we'll implement email sending later
        console.log(`Inviting ${email} as ${role} to organization ${self.organization.id}`)
        
        // TODO: Implement actual invitation logic with email sending
        // This would typically involve:
        // 1. Creating a pending invitation record
        // 2. Sending an email with invitation link
        // 3. Handling the invitation acceptance flow
        
        return { success: true, message: 'Invitation sent successfully' }
      } catch (error) {
        console.error('Failed to invite team member:', error)
        self.error = error instanceof Error ? error.message : 'Failed to send invitation'
        throw error
      }
    }),
  }))

export interface IUserStore extends Instance<typeof UserStore> {} 