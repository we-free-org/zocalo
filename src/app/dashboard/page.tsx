'use client'

import { Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { WelcomeContent } from '@/components/dashboard/welcome-content'
import { Loader2 } from 'lucide-react'

const DashboardContent = observer(() => {
  return (
    <DashboardLayout>
      <WelcomeContent />
    </DashboardLayout>
  )
})

export default function DashboardPage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      }>
        <DashboardContent />
      </Suspense>
    </AuthProvider>
  )
} 