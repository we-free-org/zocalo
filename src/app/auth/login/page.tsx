'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { checkCurrentUserProfileCompletion, shouldRedirectToProfileCompletion } from '@/lib/profile-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allowPublicSignup, setAllowPublicSignup] = useState(false)
  const [instanceName, setInstanceName] = useState('Zocalo')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getGlobalSettings()
        setAllowPublicSignup(settings.allowPublicSignup)
        setInstanceName(settings.instanceName)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    loadSettings()
  }, [])

  // Show setup complete message if redirected from setup
  useEffect(() => {
    if (searchParams.get('setup') === 'complete') {
      setError(null)
      // You could show a success message here instead
    }
  }, [searchParams])

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        throw signInError
      }

      if (data.user) {
        // Check if user needs to complete their profile
        try {
          const profileStatus = await checkCurrentUserProfileCompletion()
          
          if (shouldRedirectToProfileCompletion(profileStatus)) {
            router.push('/auth/complete-profile')
            return
          }
        } catch (err) {
          console.error('Failed to check profile completion:', err)
          // Continue to dashboard if profile check fails
        }

        // Redirect to dashboard or intended destination
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        router.push(redirectTo)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Orange Zocalo Logo */}
          <div className="mx-auto">
            <div className="text-4xl font-bold text-orange-500">
              zocalo
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Sign in to {instanceName}
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Enter your email and password to access your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="Enter your email"
                required
                autoComplete="email"
                className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <Link
                href="/auth/recover"
                className="text-sm text-orange-600 hover:text-orange-500 underline"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              {allowPublicSignup ? (
                <span>
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/signup"
                    className="text-orange-600 hover:text-orange-500 underline"
                  >
                    Sign up
                  </Link>
                </span>
              ) : (
                <span>
                  Need access?{' '}
                  <Link
                    href="/auth/request-invite"
                    className="text-orange-600 hover:text-orange-500 underline"
                  >
                    Request an invite
                  </Link>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
} 