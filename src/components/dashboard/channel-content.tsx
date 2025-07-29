'use client'

import { MessageView } from '@/components/messaging'

interface Channel {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_at: string
}

interface ChannelContentProps {
  channel: Channel | null
  onChannelUpdate?: (channel: Channel) => void
}

export function ChannelContent({ channel, onChannelUpdate }: ChannelContentProps) {
  // Transform channel to MessageViewConfig
  const messageConfig = channel ? {
    type: 'channel' as const,
    id: channel.id,
    name: channel.name,
    description: channel.description,
    is_private: channel.is_private
  } : null

  return (
    <MessageView 
      config={messageConfig}
      onUpdate={onChannelUpdate ? (config) => {
        // Transform back to channel format if needed
        if (config.type === 'channel') {
          onChannelUpdate({
            id: config.id,
            name: config.name,
            description: config.description,
            is_private: config.is_private || false,
            created_at: '' // This would need to be handled properly
          })
        }
      } : undefined}
    />
  )
} 