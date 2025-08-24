'use client'

import { useState, useEffect, Suspense } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthProvider } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, User, Lock, Trash2, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores'

const ProfileContent = observer(() => {
  const router = useRouter()
  const userStore = useUserStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  // Load user profile data
  useEffect(() => {
    if (userStore.profile) {
      setFormData({
        firstName: userStore.profile.first_name || '',
        lastName: userStore.profile.last_name || '',
        bio: userStore.profile.bio || '',
        avatarUrl: userStore.profile.avatar_url || '',
        newPassword: '',
        confirmNewPassword: ''
      })
    }
  }, [userStore.profile])

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
      if (!userStore.user) throw new Error('No user found')

      // Validate new password if provided
      if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
        throw new Error('New passwords do not match')
      }

      // Update password if provided
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        })
        if (passwordError) throw passwordError
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userStore.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          avatar_url: formData.avatarUrl,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Reload user data to reflect changes
      await userStore.loadUserData()
      
      setSuccess('Profile updated successfully!')
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        newPassword: '',
        confirmNewPassword: ''
      }))

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== userStore.user?.email) {
      setError('Email confirmation does not match')
      return
    }

    try {
      setIsLoading(true)
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      // Call delete API endpoint
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          confirmationEmail: deleteConfirmEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account')
      }
      
      // Force logout and redirect
      await supabase.auth.signOut()
      router.push('/auth/login?message=Account deleted successfully')
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  if (!userStore.user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-full bg-orange-100">
              <Settings className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Profile Settings</CardTitle>
              <CardDescription className="text-gray-600">
                Manage your personal information, password, and account settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50 text-red-800 rounded-lg" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 rounded-lg">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center text-gray-900">
                <User className="h-5 w-5 mr-3 text-orange-500" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                    className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                    className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="avatarUrl" className="text-sm font-medium text-gray-700">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={handleInputChange('avatarUrl')}
                  placeholder="https://example.com/avatar.jpg"
                  className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional: Add a URL to your profile picture
                </p>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h3 className="text-xl font-semibold flex items-center text-gray-900">
                <Lock className="h-5 w-5 mr-3 text-orange-500" />
                Change Password
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange('newPassword')}
                    placeholder="Leave blank to keep current password"
                    className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmNewPassword" className="text-sm font-medium text-gray-700">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={formData.confirmNewPassword}
                    onChange={handleInputChange('confirmNewPassword')}
                    placeholder="Confirm your new password"
                    className="mt-1 rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/')}
                className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full px-8"
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-red-600 flex items-center mb-4">
              <Trash2 className="h-5 w-5 mr-3" />
              Danger Zone
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-sm text-red-700 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="rounded-full px-6 bg-red-500 hover:bg-red-600">
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                      This action will permanently delete your account and all associated data. 
                      Please type your email address to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deleteConfirm">Email Address</Label>
                      <Input
                        id="deleteConfirm"
                        type="email"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={userStore.user?.email}
                        className="rounded-lg border-gray-200 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteDialog(false)}
                        className="rounded-full px-6"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmEmail !== userStore.user?.email || isLoading}
                        className="rounded-full px-6 bg-red-500 hover:bg-red-600"
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

const ProfilePageContent = observer(() => {
  return (
    <DashboardLayout hideSpaceControls>
      <ProfileContent />
    </DashboardLayout>
  )
})

export default function ProfilePage() {
  return (
    <AuthProvider requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </div>
      }>
        <ProfilePageContent />
      </Suspense>
    </AuthProvider>
  )
} 
