'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { ChannelsSidebar } from '@/components/dashboard/channels-sidebar'
import { ChannelContent } from '@/components/dashboard/channel-content'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

interface Channel {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_at: string
}

const ChannelsContent = observer(() => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Reset selected channel when space changes
  useEffect(() => {
    console.log('ChannelsContent: Space changed, clearing selected channel')
    setSelectedChannel(null)
  }, [spaceStore.currentSpaceId])

  console.log('ChannelsContent: Current state:', {
    currentSpaceName: spaceStore.currentSpaceName,
    currentSpaceId: spaceStore.currentSpace?.id,
    spacesCount: spaceStore.spaces.length,
    selectedChannel: selectedChannel?.name || 'none'
  })

  return (
    <div className="flex h-full">
      {/* Channels sidebar */}
      <ChannelsSidebar
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
      />
      
      {/* Main content */}
      <div className="flex-1">
        <ChannelContent 
          channel={selectedChannel}
          onChannelUpdate={setSelectedChannel}
        />
      </div>
    </div>
  )
})

const ChannelsPageContent = observer(() => {
  return (
    <DashboardLayout>
      <ChannelsContent />
    </DashboardLayout>
  )
})

export default function ChannelsPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading channels...</p>
            </div>
          </div>
        </DashboardLayout>
      }>
        <ChannelsPageContent />
      </Suspense>
    </AuthProvider>
  )
} 