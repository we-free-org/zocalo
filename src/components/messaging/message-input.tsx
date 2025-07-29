'use client'

import { useState, useRef } from 'react'
import { Paperclip, Image, Smile, Send, AtSign, X, Reply } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface User {
  id: string
  first_name?: string
  last_name?: string
}

interface Message {
  id: string
  content: string
  user: User
}

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  replyingTo: Message | null
  onCancelReply: () => void
  placeholder?: string
  accentColor?: 'red' | 'yellow' | 'blue' | 'green'
  disabled?: boolean
}

export function MessageInput({
  value,
  onChange,
  onSend,
  replyingTo,
  onCancelReply,
  placeholder = "Type a message...",
  accentColor = 'red',
  disabled = false
}: MessageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const accentColors = {
    red: 'text-red-600 hover:text-red-700 focus:border-red-500',
    yellow: 'text-yellow-600 hover:text-yellow-700 focus:border-yellow-500',
    blue: 'text-blue-600 hover:text-blue-700 focus:border-blue-500',
    green: 'text-green-600 hover:text-green-700 focus:border-green-500'
  }

  const accentBgs = {
    red: 'bg-red-600 hover:bg-red-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700'
  }

  const accentBorders = {
    red: 'border-red-200 bg-red-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend()
      }
    }
  }

  const getDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.first_name || 'Unknown User'
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Reply indicator */}
      {replyingTo && (
        <div className={cn("mb-3 p-3 rounded-lg border-l-4", accentBorders[accentColor])}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Replying to {getDisplayName(replyingTo.user)}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelReply}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 italic">
            {replyingTo.content.substring(0, 100)}
            {replyingTo.content.length > 100 && '...'}
          </p>
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-12"
          />
          
          {/* Input actions */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Attach file (Coming soon)"
            >
              <Paperclip className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Add image (Coming soon)"
            >
              <Image className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Add emoji (Coming soon)"
            >
              <Smile className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Mention user (Coming soon)"
            >
              <AtSign className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <Button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={cn("px-4", accentBgs[accentColor])}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 