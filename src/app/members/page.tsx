'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { MembersSidebar, MemberContent, Member } from '@/components/members'
import { useUserStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const MembersContent = observer(() => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const userStore = useUserStore()

  const handleMemberDeleted = () => {
    // Clear selected member and trigger refresh
    setSelectedMember(null)
    setRefreshTrigger(prev => prev + 1)
  }

  if (!userStore.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Members sidebar */}
      <div className="min-w-[384px] border-r bg-muted/30">
        <MembersSidebar
          selectedMember={selectedMember}
          onMemberSelect={setSelectedMember}
          refreshTrigger={refreshTrigger}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        <MemberContent 
          member={selectedMember}
          onMemberUpdate={setSelectedMember}
          onMemberDeleted={handleMemberDeleted}
        />
      </div>
    </div>
  )
})

const MembersPageContent = observer(() => {
  return (
    <DashboardLayout hideSpaceControls>
      <MembersContent />
    </DashboardLayout>
  )
})

export default function MembersPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading members...</span>
          </div>
        </div>
      }>
        <MembersPageContent />
      </Suspense>
    </AuthProvider>
  )
} 
