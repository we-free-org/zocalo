'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Lock, Paperclip, Image, Smile, Send, AtSign, Reply, X, Edit, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_at: string
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
  user: {
    id: string
    first_name?: string
    last_name?: string
  }
}

interface ChannelContentProps {
  channel: Channel | null
  onChannelUpdate?: (channel: Channel) => void
}

export function ChannelContent({ channel }: ChannelContentProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (channel) {
      loadMessages()
      getCurrentUser()
      checkEncryptionSettings()
    }
  }, [channel])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
  }

  const checkEncryptionSettings = async () => {
    try {
      console.log('CheckEncryptionSettings: Fetching encryption setting...')
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'encrypt_messages')
        .eq('scope', 'global')
        .single()

      if (error) {
        console.error('Failed to get encryption settings:', error)
        return
      }

      console.log('CheckEncryptionSettings: Raw setting data:', data)

      // Handle both JSON and plain string values
      let encryptionSetting = 'none'
      if (data?.value) {
        try {
          // For JSON column, the value might already be parsed
          if (typeof data.value === 'string') {
            encryptionSetting = JSON.parse(data.value)
          } else {
            encryptionSetting = data.value
          }
        } catch {
          // If JSON parsing fails, use the raw string value
          encryptionSetting = data.value
        }
      }
      
      console.log('CheckEncryptionSettings: Parsed encryption setting:', encryptionSetting)
      const shouldEncrypt = encryptionSetting === 'instance_key'
      console.log('CheckEncryptionSettings: Should encrypt messages:', shouldEncrypt)
      setEncryptionEnabled(shouldEncrypt)
    } catch (error) {
      console.error('Failed to check encryption settings:', error)
    }
  }

  const decryptMessages = async (messages: Message[]) => {
    try {
      // Collect all messages that need decryption (including parent messages)
      const messagesToDecrypt: Message[] = []
      
      messages.forEach(msg => {
        // Add main message if encrypted
        if (msg.encryption_type === 'instance_key') {
          messagesToDecrypt.push(msg)
        }
        
        // Add parent message if encrypted
        if (msg.parent_message && msg.parent_message.encryption_type === 'instance_key') {
          messagesToDecrypt.push(msg.parent_message)
        }
      })
      
      if (messagesToDecrypt.length === 0) {
        setMessages(messages)
        return
      }

      console.log('DecryptMessages: Found', messagesToDecrypt.length, 'messages to decrypt')

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No auth token for decryption')
        setMessages(messages)
        return
      }

      // Call decryption API with all encrypted messages
      const response = await fetch('/api/messages/decrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ messages: messagesToDecrypt })
      })

      if (!response.ok) {
        throw new Error('Failed to decrypt messages')
      }

      const { messages: decryptedMessages } = await response.json()

      // Create a map of decrypted content by message ID
      const decryptedMap = new Map(
        decryptedMessages.map((msg: any) => [msg.id, msg.content])
      )

      console.log('DecryptMessages: Successfully decrypted', decryptedMessages.length, 'messages')

      // Replace encrypted content with decrypted content for both main and parent messages
      const updatedMessages = messages.map(msg => ({
        ...msg,
        content: decryptedMap.get(msg.id) as string || msg.content,
        parent_message: msg.parent_message ? {
          ...msg.parent_message,
          content: decryptedMap.get(msg.parent_message.id) as string || msg.parent_message.content
        } : msg.parent_message
      }))

      setMessages(updatedMessages)

    } catch (error) {
      console.error('Failed to decrypt messages:', error)
      // Set messages without decryption as fallback
      setMessages(messages)
    }
  }

  const encryptAndSendMessage = async (content: string, messageData: Record<string, unknown>) => {
    try {
      console.log('EncryptAndSendMessage: Encryption enabled:', encryptionEnabled)
      
      if (!encryptionEnabled) {
        // Send unencrypted message
        console.log('EncryptAndSendMessage: Sending unencrypted message')
        return await supabase
          .from('messages')
          .insert({
            ...messageData,
            content,
            encryption_type: 'none'
          })
      }

      console.log('EncryptAndSendMessage: Attempting to encrypt message')

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No auth token for encryption')
      }

      // Encrypt the message content
      const encryptResponse = await fetch('/api/messages/encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ content })
      })

      if (!encryptResponse.ok) {
        throw new Error('Failed to encrypt message')
      }

      const { encryptedContent, encryptionType } = await encryptResponse.json()

      // Send encrypted message
      console.log('EncryptAndSendMessage: Sending encrypted message')
      return await supabase
        .from('messages')
        .insert({
          ...messageData,
          content: encryptedContent,
          encryption_type: encryptionType
        })

    } catch (error) {
      console.error('Encryption error, sending unencrypted:', error)
      // Fallback to unencrypted
      return await supabase
        .from('messages')
        .insert({
          ...messageData,
          content,
          encryption_type: 'none'
        })
    }
  }

  const loadMessages = async () => {
    if (!channel) return

    console.log('LoadMessages: Loading messages for channel:', channel.id)
    console.log('LoadMessages: Encryption enabled:', encryptionEnabled)
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          is_edited,
          edited_at,
          encryption_type,
          status,
          deleted_by,
          deleted_at,
          parent_message_id,
          parent_message:parent_message_id (
            id,
            content,
            created_at,
            is_edited,
            encryption_type,
            profiles:user_id (
              id,
              first_name,
              last_name
            )
          ),
          profiles:user_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('channel_id', channel.id)
        .in('status', ['approved', 'deleted']) // Include approved and deleted messages
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load messages:', error)
      } else {
        // Transform the data to match our Message interface  
        const formattedMessages = (data || []).map((msg: any) => ({
          id: msg.id,
                      content: msg.content,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            is_edited: msg.is_edited,
            edited_at: msg.edited_at,
            encryption_type: msg.encryption_type,
            status: msg.status,
            deleted_by: msg.deleted_by,
            deleted_at: msg.deleted_at,
            parent_message_id: msg.parent_message_id,
          parent_message: msg.parent_message ? {
            id: msg.parent_message.id,
            content: msg.parent_message.content,
            created_at: msg.parent_message.created_at,
            is_edited: msg.parent_message.is_edited,
            encryption_type: msg.parent_message.encryption_type,
            user: {
              id: msg.parent_message.profiles?.id || '',
              first_name: msg.parent_message.profiles?.first_name,
              last_name: msg.parent_message.profiles?.last_name
            }
          } : undefined,
          user: {
            id: msg.profiles?.id || '',
            first_name: msg.profiles?.first_name,
            last_name: msg.profiles?.last_name
          }
        }))

        // Decrypt messages if needed
        await decryptMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !channel) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editingMessage) {
        // Update existing message - handle encryption for edits
        const updateData: Record<string, string | boolean> = {
          content: newMessage.trim(),
          is_edited: true,
          edited_at: new Date().toISOString()
        }

        // If the original message was encrypted, encrypt the edit too
        if (editingMessage.encryption_type === 'instance_key' && encryptionEnabled) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              const encryptResponse = await fetch('/api/messages/encrypt', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ content: newMessage.trim() })
              })

              if (encryptResponse.ok) {
                const { encryptedContent } = await encryptResponse.json()
                updateData.content = encryptedContent
              }
            }
          } catch (error) {
            console.error('Failed to encrypt edited message:', error)
            // Continue with unencrypted content
          }
        }

        const { error } = await supabase
          .from('messages')
          .update(updateData)
          .eq('id', editingMessage.id)

        if (error) {
          console.error('Failed to update message:', error)
          return
        }

        setEditingMessage(null)
      } else {
        // Create new message with encryption
        const messageData = {
          channel_id: channel.id,
          user_id: user.id,
          parent_message_id: replyingTo?.id || null
        }

        const { error } = await encryptAndSendMessage(newMessage.trim(), messageData)

        if (error) {
          console.error('Failed to send message:', error)
          return
        }
      }

      setNewMessage('')
      setReplyingTo(null)
      await loadMessages() // Reload messages to show the new one
    } catch (error) {
      console.error('Failed to send message:', error)
    }
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

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    setEditingMessage(null) // Clear editing if replying
  }

  const handleEdit = (message: Message) => {
    setEditingMessage(message)
    setNewMessage(message.content)
    setReplyingTo(null) // Clear reply if editing
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setNewMessage('')
  }

  const isMessageOwner = (message: Message) => {
    return currentUserId && message.user.id === currentUserId
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

  const canDeleteMessage = (message: Message) => {
    // Message owner can always delete their own messages
    if (currentUserId && message.user.id === currentUserId) {
      return true
    }
    
    // TODO: Add admin/founder role check here when user roles are available
    // For now, only message owners can delete
    return false
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Welcome to Channels
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select a channel from the sidebar to start viewing and participating in conversations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="border-b bg-card p-4 pb-5">
        <div className="flex items-center space-x-3">
          {channel.is_private ? (
            <Lock className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Hash className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <h1 className="text-lg font-semibold">{channel.name}</h1>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                {channel.is_private ? (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <Hash className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Welcome to #{channel.name}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                This is the beginning of the #{channel.name} channel. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex space-x-3 mb-4">
              <Avatar className="w-10 h-10 mt-1">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs font-medium bg-green-100 text-green-700">
                  {getUserInitials(message.user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 mb-2">
                                 
                 <div className="bg-muted/40 rounded-lg px-4 py-3 border border-border/50 shadow-sm group hover:bg-muted/60 transition-colors">
                   {/* Parent message preview for threads */}
                   {message.parent_message && (
                     <div className="mb-3 p-2 bg-muted/60 rounded border-l-2 border-green-500">
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
                              onClick={() => handleEdit(message)}
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
                            onClick={() => handleReply(message)}
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

      {/* Message Input */}
      <div className="border-t bg-card p-4">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Replying to {getUserDisplayName(replyingTo.user)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelReply}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2 border-l-2 border-green-500 pl-3">
              {replyingTo.content}
            </div>
          </div>
        )}

        {/* Edit Preview */}
        {editingMessage && (
          <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Editing message
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground line-clamp-2 border-l-2 border-orange-500 pl-3">
              {editingMessage.content}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                editingMessage 
                  ? 'Edit your message...' 
                  : replyingTo 
                    ? `Reply to ${getUserDisplayName(replyingTo.user)}...` 
                    : `Message #${channel.name}`
              }
              className="pr-32 min-h-[40px] resize-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-muted-foreground/50 cursor-not-allowed"
                title="File attachments - Coming soon"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-muted-foreground/50 cursor-not-allowed"
                title="Image uploads - Coming soon"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-muted-foreground/50 cursor-not-allowed"
                title="Emoji picker - Coming soon"
              >
                <Smile className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0 text-muted-foreground/50 cursor-not-allowed"
                title="User mentions - Coming soon"
              >
                <AtSign className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={!newMessage.trim()}
            className={editingMessage 
              ? "bg-orange-600 hover:bg-orange-700 h-10 w-10 p-0" 
              : "bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
            }
          >
            {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
} 