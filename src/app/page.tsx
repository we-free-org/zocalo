'use client'

import { useEffect } from 'react'
import { Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { WelcomeContent } from '@/components/dashboard/welcome-content'
import { useUserStore } from '@/stores'
import { Loader2 } from 'lucide-react'

const HomePageContent = observer(() => {
  const router = useRouter()
  const userStore = useUserStore()

  useEffect(() => {
    // Only redirect to welcome if user is definitely not authenticated
    // AuthProvider handles the main authentication logic
    if (!userStore.isAuthenticated && !userStore.isLoading) {
      router.push('/welcome')
    }
  }, [userStore.isAuthenticated, userStore.isLoading, router])

  return (
    <DashboardLayout>
      <WelcomeContent />
    </DashboardLayout>
  )
})

export default function HomePage() {
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
        <HomePageContent />
      </Suspense>
    </AuthProvider>
  )
}
