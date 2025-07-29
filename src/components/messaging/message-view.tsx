'use client'

import { useState, useEffect, useRef } from 'react'
import { Hash, Lock, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { MessagesArea, MessageInput } from '@/components/messaging'

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
    avatar_url?: string
  }
}

interface MessageViewConfig {
  type: 'channel' | 'conversation'
  id: string
  name: string
  description?: string
  is_private?: boolean
  participant?: {
    id: string
    first_name?: string
    last_name?: string
    avatar_url?: string
  }
}

interface MessageViewProps {
  config: MessageViewConfig | null
  onUpdate?: (config: MessageViewConfig) => void
}

export function MessageView({ config }: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configuration based on type
  const accentColor = config?.type === 'channel' ? 'green' : 'yellow'
  const isChannel = config?.type === 'channel'
  const isConversation = config?.type === 'conversation'

  useEffect(() => {
    if (config) {
      loadMessages()
      getCurrentUser()
      checkEncryptionSettings()
    }
  }, [config])

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
        // Add main message if encrypted (handle both instance_key and client encryption)
        if (msg.encryption_type === 'instance_key' || msg.encryption_type === 'client') {
          messagesToDecrypt.push(msg)
        }
        
        // Add parent message if encrypted
        if (msg.parent_message && (msg.parent_message.encryption_type === 'instance_key' || msg.parent_message.encryption_type === 'client')) {
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
        decryptedMessages.map((msg: Record<string, unknown>) => [msg.id, msg.content])
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
        // Send unencrypted message when encryption is disabled globally
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
          encryption_type: encryptionType || (isChannel ? 'instance_key' : 'client')
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
    if (!config) return

    console.log('LoadMessages: Loading messages for:', config.type, config.id)
    setIsLoading(true)
    try {
      const filterField = isChannel ? 'channel_id' : 'conversation_id'
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
            last_name,
            avatar_url
          )
        `)
        .eq(filterField, config.id)
        .in('status', ['approved', 'deleted']) // Include approved and deleted messages
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to load messages:', error)
      } else {
        // Transform the data to match our Message interface  
        const formattedMessages = (data || []).map((msg: unknown) => ({
          id: (msg as Record<string, unknown>).id,
          content: (msg as Record<string, unknown>).content,
          created_at: (msg as Record<string, unknown>).created_at,
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
            last_name: msg.profiles?.last_name,
            avatar_url: msg.profiles?.avatar_url
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !config) return

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
        if ((editingMessage.encryption_type === 'instance_key' || editingMessage.encryption_type === 'client') && encryptionEnabled) {
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
          [isChannel ? 'channel_id' : 'conversation_id']: config.id,
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

  const getUserDisplayName = (user: Message['user'] | { first_name?: string; last_name?: string }) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.first_name) {
      return user.first_name
    }
    if (user.last_name) {
      return user.last_name
    }
    if ('id' in user) {
      return `User ${user.id.slice(0, 8)}`
    }
    return 'Unknown User'
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

  const handleDelete = async () => {
    // This function is now handled by MessagesArea component
  }

  // Empty state configuration
  const getEmptyStateConfig = () => {
    if (isChannel) {
      return {
        icon: (config?.is_private ? 'lock' : 'hash') as 'hash' | 'lock' | 'message',
        title: `Welcome to #${config?.name}`,
        description: `This is the beginning of the #${config?.name} channel. Start the conversation!`
      }
    } else {
      return {
        icon: 'message' as 'hash' | 'lock' | 'message',
        title: 'Start a conversation',
        description: `Send a message to ${getUserDisplayName(config?.participant || {})} to start your conversation`
      }
    }
  }

  // Header configuration
  const renderHeader = () => {
    if (isChannel) {
      return (
        <div className="border-b bg-card p-4 pb-5">
          <div className="flex items-center space-x-3">
            {config?.is_private ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Hash className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <h1 className="text-lg font-semibold">{config?.name}</h1>
              {config?.description && (
                <p className="text-sm text-muted-foreground">{config.description}</p>
              )}
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div className="border-b p-4 bg-card">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-yellow-600" />
              <h1 className="text-lg font-semibold text-foreground">
                {getUserDisplayName(config?.participant || {})}
              </h1>
            </div>
            <div className="flex items-center space-x-2 text-yellow-600">
              <Lock className="h-4 w-4" />
              <span className="text-sm">Direct Message</span>
            </div>
          </div>
        </div>
      )
    }
  }

  // Empty state for no selection
  if (!config) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Welcome to Messages
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select a channel or conversation from the sidebar to start viewing and participating in conversations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {renderHeader()}

      {/* Messages Area */}
      <MessagesArea
        messages={messages}
        isLoading={isLoading}
        currentUserId={currentUserId}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onReply={handleReply}
        onEdit={handleEdit}
        onCancelReply={cancelReply}
        onCancelEdit={cancelEdit}
        onDelete={handleDelete}
        loadMessages={loadMessages}
        accentColor={accentColor}
        emptyStateConfig={getEmptyStateConfig()}
      />

      {/* Message Input */}
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
        placeholder={
          editingMessage 
            ? 'Edit your message...' 
            : replyingTo 
              ? `Reply to ${getUserDisplayName(replyingTo.user)}...` 
              : isChannel
                ? `Message #${config.name}`
                : `Message ${getUserDisplayName(config.participant || {})}...`
        }
        accentColor={accentColor}
        disabled={false}
      />
    </div>
  )
} 