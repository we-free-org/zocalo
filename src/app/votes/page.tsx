'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { VotesSidebar, VoteContent, Vote } from '@/components/votes'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const VotesContent = observer(() => {
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Reset selected vote when space changes
  useEffect(() => {
    setSelectedVote(null)
  }, [spaceStore.currentSpaceId])

  if (!userStore.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Votes Sidebar */}
      <div className="min-w-[384px] border-r bg-muted/30">
        <VotesSidebar 
          selectedVote={selectedVote}
          onVoteSelect={setSelectedVote}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <VoteContent 
          vote={selectedVote}
          onVoteUpdate={setSelectedVote}
        />
      </div>
    </div>
  )
})

const VotesPageContent = observer(() => {
  return (
    <DashboardLayout>
      <VotesContent />
    </DashboardLayout>
  )
})

export default function VotesPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading votes...</p>
            </div>
          </div>
        </DashboardLayout>
      }>
        <VotesPageContent />
      </Suspense>
    </AuthProvider>
  )
} 
