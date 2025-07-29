'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function RecoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState('Zocalo')
  const [mode, setMode] = useState<'request' | 'reset'>('request')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  // Load settings and check for reset mode
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getGlobalSettings()
        setInstanceName(settings.instanceName)
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }
    loadSettings()

    // Check if this is a password reset link
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')

    if (type === 'recovery' && accessToken && refreshToken) {
      setMode('reset')
      // Set the session from URL tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        formData.email,
        {
          redirectTo: `${window.location.origin}/auth/recover`
        }
      )

      if (resetError) {
        throw resetError
      }

      setSuccess(
        'Password reset instructions have been sent to your email address. Please check your inbox and follow the link to reset your password.'
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (updateError) {
        throw updateError
      }

      setSuccess('Password updated successfully! Redirecting to dashboard...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'request' ? 'Reset your password' : 'Set new password'}
          </CardTitle>
          <CardDescription>
            {mode === 'request'
              ? `Enter your email address and we'll send you a link to reset your password`
              : 'Please enter your new password below'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
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
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset email...
                  </>
                ) : (
                  'Send reset email'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  placeholder="Enter new password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link
              href="/auth/login"
              className="text-blue-600 hover:text-blue-500 underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 