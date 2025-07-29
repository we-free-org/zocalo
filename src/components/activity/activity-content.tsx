'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  Activity as ActivityIcon,
  Calendar,
  MessageSquare,
  FileText,
  Users,
  Building,
  Hash,
  Edit,
  Trash2,
  Plus,
  UserPlus,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores'
import { Activity, ActivityFilter, ActivityType } from './types'
import { cn } from '@/lib/utils'

interface ActivityContentProps {
  filter: ActivityFilter
}

const ITEMS_PER_PAGE = 50

function EmptyActivityState({ filter }: { filter: ActivityFilter }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        <ActivityIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No activity found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {filter.space_id !== 'all' || filter.user_id !== 'all' 
            ? 'No activity matches your current filter. Try adjusting your selection.'
            : 'No activity has been recorded yet. Activity will appear here as users interact with the platform.'
          }
        </p>
      </div>
    </div>
  )
}

function ActivityTypeIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case 'channel_created':
    case 'channel_updated':
    case 'channel_deleted':
      return <Hash className="h-4 w-4" />
    
    case 'message_posted':
    case 'message_edited':
    case 'message_deleted':
      return <MessageSquare className="h-4 w-4" />
    
    case 'event_created':
    case 'event_updated':
    case 'event_deleted':
      return <Calendar className="h-4 w-4" />
    
    case 'file_uploaded':
    case 'file_deleted':
    case 'entity_created':
    case 'entity_updated':
    case 'entity_deleted':
      return <FileText className="h-4 w-4" />
    
    case 'comment_created':
    case 'comment_updated':
    case 'comment_deleted':
      return <MessageSquare className="h-4 w-4" />
    
    case 'member_invited':
    case 'member_role_changed':
      return <UserPlus className="h-4 w-4" />
    
    case 'space_permission_granted':
    case 'space_permission_revoked':
      return <Shield className="h-4 w-4" />
    
    default:
      return <ActivityIcon className="h-4 w-4" />
  }
}

function ActivityTypeColor({ type }: { type: ActivityType }) {
  switch (type) {
    case 'channel_created':
    case 'channel_updated':
      return 'bg-blue-100 text-blue-600'
    case 'channel_deleted':
      return 'bg-red-100 text-red-600'
    
    case 'message_posted':
      return 'bg-green-100 text-green-600'
    case 'message_edited':
      return 'bg-yellow-100 text-yellow-600'
    case 'message_deleted':
      return 'bg-red-100 text-red-600'
    
    case 'event_created':
    case 'event_updated':
      return 'bg-purple-100 text-purple-600'
    case 'event_deleted':
      return 'bg-red-100 text-red-600'
    
    case 'file_uploaded':
    case 'entity_created':
      return 'bg-indigo-100 text-indigo-600'
    case 'file_deleted':
    case 'entity_deleted':
      return 'bg-red-100 text-red-600'
    case 'entity_updated':
      return 'bg-yellow-100 text-yellow-600'
    
    case 'comment_created':
      return 'bg-teal-100 text-teal-600'
    case 'comment_updated':
      return 'bg-yellow-100 text-yellow-600'
    case 'comment_deleted':
      return 'bg-red-100 text-red-600'
    
    case 'member_invited':
    case 'space_permission_granted':
      return 'bg-emerald-100 text-emerald-600'
    case 'member_role_changed':
      return 'bg-orange-100 text-orange-600'
    case 'space_permission_revoked':
      return 'bg-red-100 text-red-600'
    
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function ActivityItem({ activity }: { activity: Activity }) {
  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const displayName = activity.user?.first_name && activity.user?.last_name 
    ? `${activity.user.first_name} ${activity.user.last_name}`
    : activity.user?.first_name || activity.user?.email || 'Unknown User'

  const timeAgo = new Date(activity.created_at).toLocaleString()

  return (
    <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
      {/* Activity Type Icon */}
      <div className={cn(
        "p-2 rounded-full flex-shrink-0",
        ActivityTypeColor({ type: activity.type })
      )}>
        <ActivityTypeIcon type={activity.type} />
      </div>

      {/* User Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={activity.user?.avatar_url} />
        <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
          {getInitials(activity.user?.first_name, activity.user?.last_name, activity.user?.email)}
        </AvatarFallback>
      </Avatar>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo}
          </span>
          {activity.space && (
            <>
              <span className="text-xs text-muted-foreground">in</span>
              <Badge variant="outline" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                {activity.space.name}
              </Badge>
            </>
          )}
        </div>
        
        <p className="text-sm text-foreground">
          {activity.description}
        </p>
        
        {activity.target_name && (
          <p className="text-xs text-muted-foreground mt-1">
            Target: {activity.target_name}
          </p>
        )}

        {/* Show metadata if available */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View details
            </summary>
            <pre className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded text-wrap">
              {JSON.stringify(activity.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export const ActivityContent = observer(({ filter }: ActivityContentProps) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const userStore = useUserStore()

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalCount)

  // Load activities based on filter
  useEffect(() => {
    const loadActivities = async () => {
      if (!userStore.user) return
      
      setIsLoading(true)
      try {
        let query = supabase
          .from('activities')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(startIndex, endIndex - 1)

        // Apply space filter
        if (filter.space_id && filter.space_id !== 'all') {
          query = query.eq('space_id', filter.space_id)
        }

        // Apply user filter
        if (filter.user_id && filter.user_id !== 'all') {
          query = query.eq('user_id', filter.user_id)
        }

        // Apply activity type filter
        if (filter.activity_type && filter.activity_type !== 'all') {
          query = query.eq('type', filter.activity_type)
        }

        // Apply date filters
        if (filter.date_from) {
          query = query.gte('created_at', filter.date_from)
        }
        if (filter.date_to) {
          query = query.lte('created_at', filter.date_to)
        }

        const { data: activitiesData, error: activitiesError, count } = await query

        if (activitiesError) {
          console.error('Error loading activities:', activitiesError)
          return
        }

        if (!activitiesData) {
          setActivities([])
          setTotalCount(0)
          setHasMore(false)
          return
        }

        console.log('Loaded activities:', activitiesData)
        setTotalCount(count || 0)
        setHasMore(endIndex < (count || 0))

        // Get user profiles for activities
        const userIds = [...new Set(activitiesData.map(a => a.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds)

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
                userIds: userIds
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

        // Get space information for activities that have space_id
        const spaceIds = [...new Set(activitiesData.filter(a => a.space_id).map(a => a.space_id!))]
        const { data: spaces } = spaceIds.length > 0 ? await supabase
          .from('spaces')
          .select('id, name, description')
          .in('id', spaceIds) : { data: [] }

        // Combine data
        const enrichedActivities: Activity[] = activitiesData.map(activity => {
          const profile = profiles?.find(p => p.id === activity.user_id)
          const email = authEmails[activity.user_id] || 'unknown@email.com'
          const space = activity.space_id ? spaces?.find(s => s.id === activity.space_id) : undefined

          return {
            ...activity,
            user: {
              id: activity.user_id,
              email,
              first_name: profile?.first_name,
              last_name: profile?.last_name,
              avatar_url: profile?.avatar_url
            },
            space: space ? {
              id: space.id,
              name: space.name,
              description: space.description
            } : undefined
          }
        })

        setActivities(enrichedActivities)
      } catch (error) {
        console.error('Error loading activities:', error)
        setActivities([])
        setTotalCount(0)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Reset to page 1 when filter changes
    if (currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    loadActivities()
  }, [userStore.user, filter, currentPage, startIndex, endIndex])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return <EmptyActivityState filter={filter} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Activity Feed</h2>
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{endIndex} of {totalCount} activities
            </p>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{endIndex} of {totalCount} activities
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}) 