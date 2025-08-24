'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isSetupCompleted } from '@/lib/supabase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface SetupFormData {
  instanceName: string
  instanceDomain: string
  adminEmail: string
  adminPassword: string
  adminFirstName: string
  adminLastName: string
  allowPublicSignup: boolean
  requireEmailConfirmation: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<SetupFormData>({
    instanceName: '',
    instanceDomain: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    allowPublicSignup: true,
    requireEmailConfirmation: true
  })

  // Check if setup has already been completed
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const setupComplete = await isSetupCompleted()
        if (setupComplete) {
          // Setup already completed, redirect to dashboard
          router.push('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking setup status:', error)
        // Continue to show setup page if there's an error
      } finally {
        setPageLoading(false)
      }
    }

    checkSetupStatus()
  }, [router])

  const handleInputChange = (field: keyof SetupFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Setup failed')
      }

      // Redirect to login or dashboard
      router.push('/auth/login?setup=complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Checking setup status...</span>
        </div>
      </div>
    )
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
            <CardTitle className="text-3xl font-bold text-gray-900">Setup</CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              Configure your Zocalo instance and create the administrator account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instance Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Instance Configuration</h3>
              
              <div>
                <Label htmlFor="instanceName">Instance Name</Label>
                <Input
                  id="instanceName"
                  type="text"
                  value={formData.instanceName}
                  onChange={handleInputChange('instanceName')}
                  placeholder="My Organization"
                  required
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="instanceDomain">Instance Domain</Label>
                <Input
                  id="instanceDomain"
                  type="url"
                  value={formData.instanceDomain}
                  onChange={handleInputChange('instanceDomain')}
                  placeholder="https://zocalo.mycompany.com"
                  required
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Admin Account */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Administrator Account</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminFirstName">First Name</Label>
                  <Input
                    id="adminFirstName"
                    type="text"
                    value={formData.adminFirstName}
                    onChange={handleInputChange('adminFirstName')}
                    required
                    className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="adminLastName">Last Name</Label>
                  <Input
                    id="adminLastName"
                    type="text"
                    value={formData.adminLastName}
                    onChange={handleInputChange('adminLastName')}
                    required
                    className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adminEmail">Email Address</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={handleInputChange('adminEmail')}
                  required
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={handleInputChange('adminPassword')}
                  minLength={8}
                  required
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Settings</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowPublicSignup"
                  checked={formData.allowPublicSignup}
                  onCheckedChange={(checked: boolean) =>
                    setFormData(prev => ({ ...prev, allowPublicSignup: checked }))
                  }
                />
                <Label htmlFor="allowPublicSignup">Allow public signup</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireEmailConfirmation"
                  checked={formData.requireEmailConfirmation}
                  onCheckedChange={(checked: boolean) =>
                    setFormData(prev => ({ ...prev, requireEmailConfirmation: checked }))
                  }
                />
                <Label htmlFor="requireEmailConfirmation">Require email confirmation</Label>
              </div>
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
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 