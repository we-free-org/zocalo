'use client'

import { useState, useEffect, useRef } from 'react'
import { Reply, Edit, Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface User {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
}

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
  user: User
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string | null
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onDelete: (messageId: string) => void
  onUpdateMessage: (updatedMessage: Message) => void
  accentColor?: 'red' | 'yellow' | 'blue' | 'green'
}

export function MessageList({ 
  messages, 
  currentUserId, 
  onReply, 
  onEdit, 
  onDelete, 
  onUpdateMessage,
  accentColor = 'red'
}: MessageListProps) {
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const accentColors = {
    red: 'text-red-600 hover:text-red-700',
    yellow: 'text-yellow-600 hover:text-yellow-700', 
    blue: 'text-blue-600 hover:text-blue-700',
    green: 'text-green-600 hover:text-green-700'
  }

  const accentBorders = {
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    blue: 'border-blue-200 bg-blue-50', 
    green: 'border-green-200 bg-green-50'
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStartEdit = (message: Message) => {
    setEditingMessage(message)
    setEditContent(message.content)
    onEdit(message)
  }

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .update({
          content: editContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id)
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      const updatedMessage = {
        ...data,
        user: data.profiles
      }

      onUpdateMessage(updatedMessage)
      setEditingMessage(null)
      setEditContent('')
    } catch (error) {
      console.error('Error updating message:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setEditContent('')
  }

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.first_name || 'Unknown User'
  }

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.first_name?.[0]?.toUpperCase() || 'U'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const isDeleted = (message: Message) => {
    return message.status === 'deleted' || message.deleted_at
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="group">
          {/* Thread indicator */}
          {message.parent_message && (
            <div className={cn("mb-2 pl-4 border-l-2", accentBorders[accentColor])}>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Reply className="h-3 w-3" />
                <span>Replying to {getDisplayName(message.parent_message.user)}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 italic">
                {isDeleted(message.parent_message) ? 
                  '[Message deleted]' : 
                  message.parent_message.content.substring(0, 100) + 
                  (message.parent_message.content.length > 100 ? '...' : '')
                }
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.user.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                {getInitials(message.user)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-foreground">
                  {getDisplayName(message.user)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.created_at)}
                  {message.is_edited && (
                    <span className="ml-1 italic">(edited)</span>
                  )}
                </span>
              </div>

              <div className="mt-1">
                {editingMessage?.id === message.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border rounded-md text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    "text-sm",
                    isDeleted(message) ? "italic text-muted-foreground" : "text-foreground"
                  )}>
                    {isDeleted(message) ? '[Message deleted]' : message.content}
                  </div>
                )}
              </div>

              {/* Message actions */}
              {!isDeleted(message) && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReply(message)}
                    className={cn("h-6 px-2 text-xs", accentColors[accentColor])}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  
                  {currentUserId === message.user.id && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(message)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(message.id)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
} 