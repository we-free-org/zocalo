'use client'

import { MessageView } from '@/components/messaging'

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

interface ConversationContentProps {
  conversation: Conversation | null
  onConversationUpdate?: (conversation: Conversation) => void
}

export function ConversationContent({ conversation, onConversationUpdate }: ConversationContentProps) {
  // Transform conversation to MessageViewConfig
  const messageConfig = conversation ? {
    type: 'conversation' as const,
    id: conversation.id,
    name: conversation.name || 'Direct Message',
    description: conversation.description,
    participant: conversation.participant
  } : null

  return (
    <MessageView 
      config={messageConfig}
      onUpdate={onConversationUpdate ? (config) => {
        // Transform back to conversation format if needed
        if (config.type === 'conversation' && conversation) {
          onConversationUpdate({
            ...conversation,
            name: config.name,
            description: config.description
          })
        }
      } : undefined}
    />
  )
} 