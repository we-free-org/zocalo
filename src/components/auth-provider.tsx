'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useUserStore, useSpaceStore } from '@/stores'
import { Loader2 } from 'lucide-react'

interface AuthProviderProps {
  children: ReactNode
  requireAuth?: boolean
  requireProfile?: boolean
  redirectTo?: string
}

const AuthProviderComponent = ({ 
  children, 
  requireAuth = false, 
  requireProfile = false,
  redirectTo = '/auth/login' 
}: AuthProviderProps) => {
  const router = useRouter()
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  useEffect(() => {
    const checkAuth = async () => {
      // Check session first
      await userStore.checkSession()
      
      // If auth is required but user is not authenticated
      if (requireAuth && !userStore.isAuthenticated) {
        router.push(redirectTo)
        return
      }

      // If authenticated, load user data and spaces
      if (userStore.isAuthenticated && !userStore.profile) {
        await userStore.loadUserData()
      }
      
      // Load spaces if authenticated
      if (userStore.isAuthenticated && userStore.user?.id && !spaceStore.hasSpaces) {
        await spaceStore.loadSpaces(userStore.user.id)
      }

      // If profile is required but not found
      if (requireProfile && userStore.isAuthenticated && !userStore.hasProfile) {
        router.push('/setup') // or wherever profile setup happens
        return
      }
    }

    checkAuth()
  }, [userStore, router, requireAuth, requireProfile, redirectTo])

  // Show loading while checking auth
  if (userStore.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if any
  if (userStore.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-red-600">Authentication Error</div>
          <p className="text-muted-foreground">{userStore.error}</p>
          <button 
            onClick={() => {
              userStore.clearError()
              userStore.checkSession()
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Don't render if auth is required but user is not authenticated
  if (requireAuth && !userStore.isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export const AuthProvider = observer(AuthProviderComponent) 