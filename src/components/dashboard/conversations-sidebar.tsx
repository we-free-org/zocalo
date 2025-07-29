'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Plus, MessageCircle, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  type: string
  name?: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  last_message_at?: string
  participant?: {
    id: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
}

interface UserWithConversation {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  conversation?: Conversation
  last_message_at?: string
}

interface ConversationsSidebarProps {
  selectedConversation: Conversation | null
  onConversationSelect: (conversation: Conversation | null) => void
}

// Empty state component
const EmptyState = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <MessageCircle className="h-12 w-12 text-yellow-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Start conversations</h3>
      <p className="text-muted-foreground">
        Click on any user to start a conversation
      </p>
    </div>
  )
}

export const ConversationsSidebar = observer(({ selectedConversation, onConversationSelect }: ConversationsSidebarProps) => {
  const [users, setUsers] = useState<UserWithConversation[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithConversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const userStore = useUserStore()

  // Load all users and their conversations
  useEffect(() => {
    const loadUsersWithConversations = async () => {
      if (!userStore.user?.id) return

      setIsLoading(true)
      try {
        // First, load all users except current user
        const { data: allUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .neq('id', userStore.user.id)
          .order('first_name', { ascending: true })

        if (usersError) throw usersError

        // Then, for each user, check if there's an existing conversation
        const usersWithConversations = (await Promise.all(
          (allUsers || []).map(async (user) => {
            try {
              // Look for existing direct conversation with this user
              const { data: userParticipants, error: participantsError } = await supabase
                .from('conversation_participants')
                .select(`
                  conversation_id,
                  conversations!inner (
                    id,
                    type,
                    name,
                    description,
                    created_by,
                    created_at,
                    updated_at,
                    last_message_at
                  )
                `)
                .eq('user_id', user.id)
                .eq('conversations.type', 'direct')
                .is('left_at', null)

              if (participantsError) {
                console.error('Error loading user conversations:', participantsError)
                return { ...user }
              }

              // Check if current user is also in any of these conversations
              if (userParticipants && userParticipants.length > 0) {
                for (const participant of userParticipants) {
                  const { data: currentUserParticipant, error: currentUserError } = await supabase
                    .from('conversation_participants')
                    .select('*')
                    .eq('conversation_id', participant.conversation_id)
                    .eq('user_id', userStore.user?.id)
                    .is('left_at', null)

                  if (!currentUserError && currentUserParticipant && currentUserParticipant.length > 0) {
                    // Found existing conversation
                    const conversationData = participant.conversations as Record<string, unknown>
                    const conversation = {
                      ...conversationData,
                      participant: user
                    } as Conversation

                    return {
                      ...user,
                      conversation,
                      last_message_at: conversationData.last_message_at
                    }
                  }
                }
              }

              // No existing conversation
              return { ...user }
            } catch (error) {
              console.error('Error processing user:', error)
              return { ...user }
            }
          })
        )) as UserWithConversation[]

        // Sort users: those with conversations first (by last_message_at), then others alphabetically
        const sortedUsers = usersWithConversations.sort((a, b) => {
          // Users with conversations come first
          if (a.conversation && !b.conversation) return -1
          if (!a.conversation && b.conversation) return 1
          
          // Both have conversations - sort by last_message_at
          if (a.conversation && b.conversation) {
            const aTime = a.conversation.last_message_at
            const bTime = b.conversation.last_message_at
            if (aTime && bTime) {
              return new Date(bTime).getTime() - new Date(aTime).getTime()
            }
            if (aTime && !bTime) return -1
            if (!aTime && bTime) return 1
          }
          
          // Neither have conversations or same conversation status - sort alphabetically
          const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim()
          const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim()
          return aName.localeCompare(bName)
        })

        console.log('Loaded users with conversations:', sortedUsers)
        setUsers(sortedUsers)
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsersWithConversations()
  }, [userStore.user?.id])

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
        return fullName.includes(query)
      })
      setFilteredUsers(filtered)
    }
  }, [users, searchQuery])

  const handleUserClick = async (user: UserWithConversation) => {
    if (!userStore.user?.id) return

    // If user already has a conversation, select it
    if (user.conversation) {
      onConversationSelect(user.conversation)
      return
    }

    // Create new conversation
    try {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          created_by: userStore.user.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Add both participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: newConversation.id,
            user_id: userStore.user.id,
            role: 'member'
          },
          {
            conversation_id: newConversation.id,
            user_id: user.id,
            role: 'member'
          }
        ])

      if (participantsError) throw participantsError

      const conversation = {
        ...newConversation,
        participant: user
      } as Conversation
      
      // Update the user in our local state
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, conversation, last_message_at: conversation.last_message_at } as UserWithConversation
          : u
      ))
      
      onConversationSelect(conversation)
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const getDisplayName = (user: UserWithConversation) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.first_name || 'Unknown User'
  }

  const getInitials = (user: UserWithConversation) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.first_name?.[0]?.toUpperCase() || 'U'
  }

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Conversations</h2>
          </div>
        </div>
        <div className="p-4 text-center text-muted-foreground">
          Loading users...
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Conversations</h2>
        </div>
        
        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center space-x-3 p-4 hover:bg-yellow-50 cursor-pointer border-r-2 transition-colors",
                selectedConversation?.participant?.id === user.id
                  ? "bg-yellow-50 border-yellow-500"
                  : "border-transparent hover:border-yellow-200"
              )}
              onClick={() => handleUserClick(user)}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="bg-yellow-100 text-yellow-600">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground truncate">
                    {getDisplayName(user)}
                  </h3>
                  {user.conversation?.last_message_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatLastMessageTime(user.conversation.last_message_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.conversation ? 'Recent activity' : 'Start conversation'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}) 