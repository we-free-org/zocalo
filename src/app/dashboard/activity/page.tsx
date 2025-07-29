'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { ActivitySidebar, ActivityContent, ActivityFilter } from '@/components/activity'
import { useUserStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const ActivityPageContent = observer(() => {
  const [filter, setFilter] = useState<ActivityFilter>({
    space_id: 'all',
    user_id: 'all',
    activity_type: 'all'
  })
  const userStore = useUserStore()

  const handleFilterChange = (newFilter: ActivityFilter) => {
    setFilter(newFilter)
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
      {/* Activity sidebar */}
      <div className="min-w-[384px] border-r bg-muted/30">
        <ActivitySidebar
          filter={filter}
          onFilterChange={handleFilterChange}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        <ActivityContent 
          filter={filter}
        />
      </div>
    </div>
  )
})

const ActivityPageLayout = observer(() => {
  return (
    <DashboardLayout hideSpaceControls>
      <ActivityPageContent />
    </DashboardLayout>
  )
})

export default function ActivityPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading activity...</span>
          </div>
        </div>
      }>
        <ActivityPageLayout />
      </Suspense>
    </AuthProvider>
  )
} 