'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import { useUserStore, useSpaceStore } from '@/stores'
import { checkCurrentUserProfileCompletion, shouldRedirectToProfileCompletion } from '@/lib/profile-utils'
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

      // Check if profile completion is needed for authenticated users
      if (userStore.isAuthenticated && userStore.user?.id) {
        try {
          const profileStatus = await checkCurrentUserProfileCompletion()
          
          if (shouldRedirectToProfileCompletion(profileStatus)) {
            // Don't redirect if we're already on the complete-profile page
            if (window.location.pathname !== '/auth/complete-profile') {
              router.push('/auth/complete-profile')
              return
            }
          }
        } catch (err) {
          console.error('Failed to check profile completion in auth provider:', err)
        }
      }

      // If profile is required but not found (legacy check)
      if (requireProfile && userStore.isAuthenticated && !userStore.hasProfile) {
        router.push('/auth/complete-profile')
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