'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Upload, User, Lock, Trash2 } from 'lucide-react'

export default function CompleteProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  // Load user and profile data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          router.push('/auth/login')
          return
        }

        setUser(user)

        // Check if user has a profile and roles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)

        // If user has profile and roles, they're editing their profile
        if (profile && userRoles && userRoles.length > 0) {
          setIsExistingUser(true)
          setFormData({
            email: user.email || '',
            password: '',
            confirmPassword: '',
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            bio: profile.bio || '',
            avatarUrl: profile.avatar_url || '',
            newPassword: '',
            confirmNewPassword: ''
          })
        } else {
          // New user completing profile
          setIsExistingUser(false)
          // Pre-fill from user metadata if available
          setFormData({
            email: user.email || '',
            password: '',
            confirmPassword: '',
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            bio: '',
            avatarUrl: '',
            newPassword: '',
            confirmNewPassword: ''
          })
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
        setError('Failed to load profile data')
      } finally {
        setPageLoading(false)
      }
    }

    loadUserData()
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
      if (!user) throw new Error('No user found')

      // For new users, validate initial password setup
      if (!isExistingUser) {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long')
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match')
        }
        
        // Set the password for new users
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.password
        })
        if (passwordError) throw passwordError
      } else {
        // For existing users, validate new password if provided
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
      }

      // Update or create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          bio: formData.bio,
          avatar_url: formData.avatarUrl,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Note: Role assignment is now handled during the invite process
      // New users should already have their roles assigned when they reach this page

      if (isExistingUser) {
        setSuccess('Profile updated successfully!')
        // Optional: redirect back to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setSuccess('Profile completed successfully! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }

    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
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
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-white">
        <CardHeader className="text-center space-y-6 pb-8">
          {/* Orange Zocalo Logo */}
          <div className="mx-auto">
            <div className="text-4xl font-bold text-orange-500">
              zocalo
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-gray-900">
              {isExistingUser ? 'Edit Profile' : 'Complete Your Profile'}
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">
              {isExistingUser 
                ? 'Update your profile information, change your password, or manage your account.'
                : 'Please complete your profile to get started with Zocalo.'
              }
            </CardDescription>
          </div>
          
          {isExistingUser && (
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 rounded-full px-6"
            >
              ← Back to Dashboard
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50 text-red-800 rounded-lg" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 text-green-800 rounded-lg">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Setup - Only for new users */}
            {!isExistingUser && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Account Setup
                </h3>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    required
                    disabled={true} // Email is set by invite, don't allow changes
                    className="rounded-lg border-gray-200 bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email is set by your invitation</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      required
                      placeholder="Create a password"
                      className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      required
                      placeholder="Confirm your password"
                      className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    required
                    className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    required
                    className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={formData.avatarUrl}
                  onChange={handleInputChange('avatarUrl')}
                  placeholder="https://example.com/avatar.jpg"
                  className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Password Section - Only for existing users */}
            {isExistingUser && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Change Password (Optional)
                </h3>
                
                                 <div>
                   <Label htmlFor="newPassword">New Password</Label>
                   <Input
                     id="newPassword"
                     type="password"
                     value={formData.newPassword}
                     onChange={handleInputChange('newPassword')}
                     placeholder="Leave blank to keep current password"
                     className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                   />
                 </div>
                 
                 <div>
                   <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                   <Input
                     id="confirmNewPassword"
                     type="password"
                     value={formData.confirmNewPassword}
                     onChange={handleInputChange('confirmNewPassword')}
                     placeholder="Confirm your new password"
                     className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                   />
                 </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full py-3 font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isExistingUser ? 'Update Profile' : 'Complete Profile'}
              </Button>
              
              {isExistingUser && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full px-6"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {/* Delete Account Section - Only for existing users */}
          {isExistingUser && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-red-600 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Danger Zone
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="mt-4 rounded-full px-6 bg-red-500 hover:bg-red-600">
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
                        placeholder={user?.email}
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
                        disabled={deleteConfirmEmail !== user?.email || isLoading}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
} 