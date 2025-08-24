'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { ConversationsSidebar } from '@/components/dashboard/conversations-sidebar'
import { ConversationContent } from '@/components/dashboard/conversation-content'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

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

const ConversationsContent = observer(() => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Reset selected conversation when space changes
  useEffect(() => {
    console.log('ConversationsContent: Space changed, clearing selected conversation')
    setSelectedConversation(null)
  }, [spaceStore.currentSpaceId])

  console.log('ConversationsContent: Current state:', {
    currentSpaceName: spaceStore.currentSpaceName,
    currentSpaceId: spaceStore.currentSpace?.id,
    spacesCount: spaceStore.spaces.length,
    selectedConversation: selectedConversation?.id || 'none'
  })

  return (
    <div className="flex h-full">
      {/* Conversations sidebar */}
      <ConversationsSidebar
        selectedConversation={selectedConversation}
        onConversationSelect={setSelectedConversation}
      />
      
      {/* Main content */}
      <div className="flex-1">
        <ConversationContent 
          conversation={selectedConversation}
          onConversationUpdate={setSelectedConversation}
        />
      </div>
    </div>
  )
})

const ConversationsPageContent = observer(() => {
  return (
    <DashboardLayout hideSpaceControls>
      <ConversationsContent />
    </DashboardLayout>
  )
})

export default function ConversationsPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout hideSpaceControls>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          </div>
        </DashboardLayout>
      }>
        <ConversationsPageContent />
      </Suspense>
    </AuthProvider>
  )
} 
