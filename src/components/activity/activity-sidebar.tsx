'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Search, Activity as ActivityIcon, Users, Building, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { useUserStore, useSpaceStore } from '@/stores'
import { cn } from '@/lib/utils'
import { ActivityFilter, SpaceOption, UserOption, TabType } from './types'

interface ActivitySidebarProps {
  filter: ActivityFilter
  onFilterChange: (filter: ActivityFilter) => void
}

function SpaceItem({ space, isSelected, onClick }: {
  space: SpaceOption
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
        <Building className="h-5 w-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {space.name}
        </p>
        {space.description && (
          <p className="text-xs text-muted-foreground truncate">
            {space.description}
          </p>
        )}
      </div>
    </div>
  )
}

function UserItem({ user, isSelected, onClick }: {
  user: UserOption
  isSelected: boolean
  onClick: () => void
}) {
  const getInitials = (displayName: string, email: string) => {
    if (displayName && displayName !== email) {
      const parts = displayName.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return displayName.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {getInitials(user.display_name, user.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {user.display_name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {user.email}
        </p>
      </div>
    </div>
  )
}

export const ActivitySidebar = observer(({ filter, onFilterChange }: ActivitySidebarProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('spaces')
  const [searchQuery, setSearchQuery] = useState('')
  const [spaces, setSpaces] = useState<SpaceOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Load spaces and users
  useEffect(() => {
    const loadData = async () => {
      if (!userStore.user) return
      
      setIsLoading(true)
      try {
        // Ensure spaces are loaded first
        if (!spaceStore.hasSpaces && userStore.user?.id) {
          await spaceStore.loadSpaces(userStore.user.id)
        }
        
        // Get spaces from the store
        const spaceOptions: SpaceOption[] = spaceStore.spaces.map(space => ({
          id: space.id,
          name: space.name,
          description: space.description || undefined
        }))
        setSpaces(spaceOptions)

        // Load users who have activity (to avoid showing inactive users)
        const { data: activeUsers, error } = await supabase
          .from('activities')
          .select('user_id')
          .not('user_id', 'is', null)

        if (!error && activeUsers) {
          // Get unique user IDs
          const uniqueUserIds = [...new Set(activeUsers.map(a => a.user_id))]
          
          // Load user profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', uniqueUserIds)

          // Get auth emails for users
          const { data: { session } } = await supabase.auth.getSession()
          let authEmails: Record<string, string> = {}
          
          if (session?.access_token) {
            try {
              const response = await fetch('/api/members/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  userIds: uniqueUserIds
                })
              })
              
              if (response.ok) {
                const emailData = await response.json()
                authEmails = emailData.emails || {}
              }
            } catch (error) {
              console.error('Failed to fetch auth emails:', error)
            }
          }

          // Combine data into user options
          const userOptions: UserOption[] = uniqueUserIds.map(userId => {
            const profile = profiles?.find(p => p.id === userId)
            const email = authEmails[userId] || 'unknown@email.com'
            const displayName = profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.first_name || email

            return {
              id: userId,
              email,
              display_name: displayName,
              avatar_url: profile?.avatar_url
            }
          })

          setUsers(userOptions.sort((a, b) => a.display_name.localeCompare(b.display_name)))
        }
      } catch (error) {
        console.error('Error loading activity filter data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userStore.user, spaceStore.spaces])

  const filteredSpaces = spaces.filter(space => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      space.name.toLowerCase().includes(query) ||
      space.description?.toLowerCase().includes(query)
    )
  })

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.display_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  })

  const handleSpaceSelect = (spaceId: string) => {
    onFilterChange({
      ...filter,
      space_id: spaceId,
      user_id: 'all' // Reset user filter when selecting space
    })
  }

  const handleUserSelect = (userId: string) => {
    onFilterChange({
      ...filter,
      user_id: userId,
      space_id: 'all' // Reset space filter when selecting user
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Activity</h1>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="pl-11 pr-4"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-4 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'spaces' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('spaces')}
            className={cn(
              "flex-1",
              activeTab === 'spaces' && "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Building className="h-4 w-4 mr-1" />
            Spaces ({filteredSpaces.length})
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1",
              activeTab === 'users' && "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Users className="h-4 w-4 mr-1" />
            Users ({filteredUsers.length})
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'spaces' ? (
          <div className="space-y-2">
            {/* All Spaces option */}
            <div
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                filter.space_id === 'all' ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
              )}
              onClick={() => handleSpaceSelect('all')}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <ActivityIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  All Spaces
                </p>
                <p className="text-xs text-muted-foreground">
                  View activity from all spaces
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {spaces.length}
              </Badge>
            </div>
            
            {filteredSpaces.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No spaces found' : 'No spaces available'}
                </p>
              </div>
            ) : (
              filteredSpaces.map((space) => (
                <SpaceItem
                  key={space.id}
                  space={space}
                  isSelected={filter.space_id === space.id}
                  onClick={() => handleSpaceSelect(space.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* All Users option */}
            <div
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                filter.user_id === 'all' ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
              )}
              onClick={() => handleUserSelect('all')}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <ActivityIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  All Users
                </p>
                <p className="text-xs text-muted-foreground">
                  View activity from all users
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {users.length}
              </Badge>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No users found' : 'No active users'}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserItem
                  key={user.id}
                  user={user}
                  isSelected={filter.user_id === user.id}
                  onClick={() => handleUserSelect(user.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}) 