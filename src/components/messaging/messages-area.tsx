'use client'

import { useState, useRef } from 'react'
import { Hash, Lock, Reply, Edit, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  created_at: string
  updated_at?: string
  is_edited?: boolean
  edited_at?: string
  encryption_type?: string
  status?: string
  deleted_by?: string
  deleted_at?: string
  parent_message_id?: string
  parent_message?: Message
  user: {
    id: string
    first_name?: string
    last_name?: string
  }
}

interface MessagesAreaProps {
  messages: Message[]
  isLoading: boolean
  currentUserId: string | null
  replyingTo: Message | null
  editingMessage: Message | null
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onCancelReply: () => void
  onCancelEdit: () => void
  onDelete: (message: Message) => void
  loadMessages: () => void
  accentColor?: 'red' | 'yellow' | 'blue' | 'green'
  emptyStateConfig: {
    icon: 'hash' | 'lock' | 'message'
    title: string
    description: string
  }
}

export function MessagesArea({
  messages,
  isLoading,
  currentUserId,
  replyingTo,
  editingMessage,
  onReply,
  onEdit,
  onCancelReply,
  onCancelEdit,
  onDelete,
  loadMessages,
  accentColor = 'red',
  emptyStateConfig
}: MessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const accentColors = {
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    blue: 'border-blue-500',
    green: 'border-green-500'
  }

  const avatarColors = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700', 
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getUserDisplayName = (user: Message['user']) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.first_name) {
      return user.first_name
    }
    if (user.last_name) {
      return user.last_name
    }
    return `User ${user.id.slice(0, 8)}`
  }

  const getUserInitials = (user: Message['user']) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase()
    }
    if (user.last_name) {
      return user.last_name[0].toUpperCase()
    }
    return user.id.slice(0, 2).toUpperCase()
  }

  const isMessageOwner = (message: Message) => {
    return currentUserId && message.user.id === currentUserId
  }

  const canDeleteMessage = (message: Message) => {
    // Message owner can always delete their own messages
    if (currentUserId && message.user.id === currentUserId) {
      return true
    }
    
    // TODO: Add admin/founder role check here when user roles are available
    // For now, only message owners can delete
    return false
  }

  const handleDelete = async (message: Message) => {
    if (!currentUserId) return

    const confirmDelete = confirm('Are you sure you want to delete this message?')
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'deleted',
          deleted_by: currentUserId,
          deleted_at: new Date().toISOString()
        })
        .eq('id', message.id)

      if (error) {
        console.error('Failed to delete message:', error)
        return
      }

      await loadMessages() // Reload messages to show the updated state
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const renderEmptyStateIcon = () => {
    const iconClasses = "w-6 h-6 text-muted-foreground"
    switch (emptyStateConfig.icon) {
      case 'hash':
        return <Hash className={iconClasses} />
      case 'lock':
        return <Lock className={iconClasses} />
      default:
        return <Hash className={iconClasses} />
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-sm text-muted-foreground">Loading messages...</div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              {renderEmptyStateIcon()}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {emptyStateConfig.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {emptyStateConfig.description}
            </p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className="flex space-x-3 mb-4">
            <Avatar className="w-10 h-10 mt-1">
              <AvatarImage src="" />
              <AvatarFallback className={cn("text-xs font-medium", avatarColors[accentColor])}>
                {getUserInitials(message.user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 mb-2">
              <div className="bg-muted/40 rounded-lg px-4 py-3 border border-border/50 shadow-sm group hover:bg-muted/60 transition-colors">
                {/* Parent message preview for threads */}
                {message.parent_message && (
                  <div className={cn("mb-3 p-2 bg-muted/60 rounded border-l-2", accentColors[accentColor])}>
                    <div className="text-xs text-muted-foreground mb-1">
                      Replying to {getUserDisplayName(message.parent_message.user)}
                    </div>
                    <div className="text-xs text-foreground/80 line-clamp-2">
                      {message.parent_message.content}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="text-m text-foreground break-words leading-relaxed flex-1">
                    {message.status === 'deleted' ? (
                      <span className="text-muted-foreground italic">
                        This message was deleted
                      </span>
                    ) : (
                      <>
                        {message.content}
                        {message.is_edited && (
                          <span className="text-xs text-muted-foreground ml-2 italic">
                            (edited)
                          </span>
                        )}
                        {message.encryption_type === 'instance_key' && (
                          <span className="inline-flex items-center ml-2" title="Encrypted">
                            <Lock className="h-3 w-3 text-green-600" />
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {message.status !== 'deleted' && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex space-x-1">
                      {isMessageOwner(message) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onEdit(message)}
                          title="Edit message"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canDeleteMessage(message) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-red-600"
                          onClick={() => handleDelete(message)}
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onReply(message)}
                        title="Reply to message"
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="font-semibold text-sm text-muted-foreground pl-4">
                  {getUserDisplayName(message.user)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
} 