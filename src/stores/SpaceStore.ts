import { types, flow, Instance } from 'mobx-state-tree'
import { supabase } from '@/lib/supabase/client'

// Space model - must match database schema
export const Space = types.model('Space', {
  id: types.identifier,
  name: types.string,
  description: types.maybeNull(types.string),
  minimum_role_level: types.maybeNull(types.number),
  created_by: types.maybeNull(types.string),
  created_at: types.string,
  updated_at: types.string,
})

// Space store
export const SpaceStore = types
  .model('SpaceStore', {
    spaces: types.array(Space),
    currentSpaceId: types.maybeNull(types.string),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
  })
  .views(self => ({
    get hasSpaces() {
      return self.spaces.length > 0
    },
    get currentSpace() {
      return self.currentSpaceId ? self.spaces.find(s => s.id === self.currentSpaceId) : null
    },
    get spaceOptions() {
      return self.spaces.map(space => ({
        id: space.id,
        name: space.name,
        description: space.description
      }))
    },
    get currentSpaceName() {
      const current = self.currentSpaceId ? self.spaces.find(s => s.id === self.currentSpaceId) : null
      return current?.name || 'No Space Selected'
    }
  }))
  .actions(self => ({
    // Load user's available spaces
    loadSpaces: flow(function* (userId: string) {
      if (!userId) {
        console.log('SpaceStore: No user ID provided')
        return
      }

      try {
        console.log('SpaceStore: Loading spaces for user:', userId)
        self.isLoading = true
        self.error = null

        // Get spaces the user has access to through user_roles
        const { data: userRoles, error } = yield supabase
          .from('user_roles')
          .select(`
            spaces:space_id (
              id,
              name,
              description,
              minimum_role_level,
              created_by,
              created_at,
              updated_at
            )
          `)
          .eq('user_id', userId)

        if (error) {
          console.error('SpaceStore: Error loading spaces:', error)
          self.error = error.message
          return
        }

        console.log('SpaceStore: Raw spaces data:', userRoles)
        
        // Extract spaces from the user_roles join
        const spaces = userRoles?.map((ur: any) => ur.spaces).filter(Boolean) || []
        console.log('SpaceStore: Processed spaces:', spaces.length)
        
        // Clear and add spaces
        self.spaces.clear()
        spaces.forEach((space: any) => {
          self.spaces.push(space)
        })
        
                // Restore saved space or default to General, then first space
        if (spaces.length > 0 && !self.currentSpaceId) {
          // Try to restore from localStorage first
          const savedSpaceId = typeof window !== 'undefined' ? localStorage.getItem('currentSpaceId') : null
          const savedSpace = savedSpaceId ? spaces.find((s: any) => s.id === savedSpaceId) : null
          
          if (savedSpace) {
            console.log('SpaceStore: Restored space from localStorage:', savedSpace.name)
            self.currentSpaceId = savedSpace.id
          } else {
            // Try to find "General" space first
            const generalSpace = spaces.find((s: any) => s.name.toLowerCase() === 'general')
            
            if (generalSpace) {
              console.log('SpaceStore: Setting General as default space')
              self.currentSpaceId = generalSpace.id
            } else {
              console.log('SpaceStore: Setting first space as current:', spaces[0].name)
              self.currentSpaceId = spaces[0].id
            }
            
                         // Persist the selection
             if (typeof window !== 'undefined' && self.currentSpaceId) {
               localStorage.setItem('currentSpaceId', self.currentSpaceId)
             }
          }
        }

      } catch (error) {
        console.error('SpaceStore: Failed to load spaces:', error)
        self.error = error instanceof Error ? error.message : 'Failed to load spaces'
      } finally {
        self.isLoading = false
      }
    }),

    // Create a new space
    createSpace: flow(function* (spaceData: { 
      name: string, 
      description?: string,
      userId: string 
    }) {
      try {
        console.log('SpaceStore: Creating space:', spaceData.name)
        self.isLoading = true
        self.error = null

        const { data: space, error } = yield supabase
          .from('spaces')
          .insert({
            name: spaceData.name,
            description: spaceData.description,
            created_by: spaceData.userId
          })
          .select()
          .single()

        if (error) {
          console.error('SpaceStore: Error creating space:', error)
          self.error = error.message
          throw error
        }

        console.log('SpaceStore: Space created successfully:', space.name)
        
        // Add the new space to our list
        self.spaces.push(space)
        
        // Set as current space
        self.currentSpaceId = space.id
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentSpaceId', space.id)
        }

        return space

      } catch (error) {
        console.error('SpaceStore: Failed to create space:', error)
        self.error = error instanceof Error ? error.message : 'Failed to create space'
        throw error
      } finally {
        self.isLoading = false
      }
    }),

    // Set current space
    setCurrentSpace(spaceId: string) {
      const space = self.spaces.find(s => s.id === spaceId)
      if (space) {
        console.log('SpaceStore: Setting current space:', space.name)
        self.currentSpaceId = spaceId
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentSpaceId', spaceId)
        }
      }
    },

    // Clear error
    clearError() {
      self.error = null
    },

    // Clear all data (for logout)
    clear() {
      self.spaces.clear()
      self.currentSpaceId = null
      self.error = null
      self.isLoading = false
    }
  }))

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ISpaceStore extends Instance<typeof SpaceStore> {} 