'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    allowPublicSignup: false,
    requireEmailConfirmation: true,
    instanceName: 'Zocalo'
  })
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  })

  // Check if public signup is allowed
  useEffect(() => {
    const checkSignupPermission = async () => {
      try {
        const globalSettings = await getGlobalSettings()
        setSettings({
          allowPublicSignup: globalSettings.allowPublicSignup,
          requireEmailConfirmation: globalSettings.requireEmailConfirmation,
          instanceName: globalSettings.instanceName
        })

        if (!globalSettings.allowPublicSignup) {
          router.push('/auth/request-invite')
          return
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        setError('Failed to load signup settings')
      } finally {
        setPageLoading(false)
      }
    }
    checkSignupPermission()
  }, [router])

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
    setSuccess(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        if (settings.requireEmailConfirmation && !data.session) {
          setSuccess(
            'Account created successfully! Please check your email for a confirmation link.'
          )
        } else {
          // Auto-signed in, redirect to dashboard
          router.push('/')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!settings.allowPublicSignup) {
    return null // Component will redirect
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
              Create your account
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Join {settings.instanceName} and start collaborating
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  placeholder="Last name"
                  required
                  autoComplete="family-name"
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

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
                placeholder="Create a password"
                minLength={8}
                required
                autoComplete="new-password"
                className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 rounded-lg">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 text-green-800 rounded-lg">
                <AlertDescription>{success}</AlertDescription>
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-orange-600 hover:text-orange-500 underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 