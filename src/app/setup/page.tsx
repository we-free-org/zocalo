'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Setup Zocalo</CardTitle>
          <CardDescription>
            Configure your Zocalo instance and create the administrator account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                />
              </div>
            </div>

            {/* Admin Account */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Administrator Account</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="adminFirstName">First Name</Label>
                  <Input
                    id="adminFirstName"
                    type="text"
                    value={formData.adminFirstName}
                    onChange={handleInputChange('adminFirstName')}
                    required
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
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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