'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { getGlobalSettings } from '@/lib/supabase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function RequestInvitePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    allowPublicSignup: false,
    instanceName: 'Zocalo'
  })
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    message: ''
  })

  // Check signup settings and redirect if public signup is allowed
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const globalSettings = await getGlobalSettings()
        setSettings({
          allowPublicSignup: globalSettings.allowPublicSignup,
          instanceName: globalSettings.instanceName
        })

        if (globalSettings.allowPublicSignup) {
          router.push('/auth/signup')
          return
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        setError('Failed to load page settings')
      } finally {
        setPageLoading(false)
      }
    }
    checkSettings()
  }, [router])

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      const { error: insertError } = await supabase
        .from('invite_requests')
        .insert({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          message: formData.message || null
        })

      if (insertError) {
        // Handle duplicate email error gracefully
        if (insertError.code === '23505') {
          throw new Error('An invite request with this email already exists')
        }
        throw insertError
      }

      setSuccess(
        'Your invite request has been submitted successfully! You will receive an email when your request is reviewed.'
      )
      
      // Clear form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        message: ''
      })
    } catch (err: any) {
      setError(err.message || 'Failed to submit invite request')
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

  if (settings.allowPublicSignup) {
    return null // Component will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
          <CardDescription>
            Request an invitation to join {settings.instanceName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
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
              />
            </div>

            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={handleInputChange('message')}
                placeholder="Tell us why you'd like to join..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Let us know a bit about yourself or why you'd like to join our community
              </p>
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
                  Submitting request...
                </>
              ) : (
                'Submit request'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
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