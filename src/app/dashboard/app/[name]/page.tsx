'use client'

import { Suspense, use } from 'react'
import { observer } from 'mobx-react-lite'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { Loader2 } from 'lucide-react'
import { ProjectsMain } from '@/app_containers/marketplace/projects'

interface AppPageProps {
  params: Promise<{
    name: string
  }>
}

const AppPageContent = observer(({ params }: AppPageProps) => {
  const resolvedParams = use(params)
  
  // For now, only handle the projects app
  if (resolvedParams.name === 'projects') {
    return (
      <DashboardLayout>
        <ProjectsMain />
      </DashboardLayout>
    )
  }

  // Default case for unknown apps
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">App &quot;{resolvedParams.name}&quot; not found</p>
        </div>
      </div>
    </DashboardLayout>
  )
})

export default function AppPage({ params }: AppPageProps) {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading app...</p>
            </div>
          </div>
        </DashboardLayout>
      }>
        <AppPageContent params={params} />
      </Suspense>
    </AuthProvider>
  )
} 