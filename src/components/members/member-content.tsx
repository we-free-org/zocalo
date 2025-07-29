'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Settings,
  CheckCircle,
  XCircle,
  Save,
  Crown,
  UserCog,
  Eye,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'
import { useUserStore, useSpaceStore } from '@/stores'
import { Member, Role, SpacePermission } from './types'
import { cn } from '@/lib/utils'

// Define system roles based on the database seeded roles
const systemRoles: Role[] = [
  {
    id: 'founder',
    name: 'founder',
    description: 'Full system access, can manage everything including spaces and users',
    level: 4,
    is_custom: false
  },
  {
    id: 'admin', 
    name: 'admin',
    description: 'Space management, user management, and content oversight',
    level: 3,
    is_custom: false
  },
  {
    id: 'editor',
    name: 'editor', 
    description: 'Content creation, editing, and moderate user management',
    level: 2,
    is_custom: false
  },
  {
    id: 'viewer',
    name: 'viewer',
    description: 'Read-only access to content within authorized spaces',
    level: 1, 
    is_custom: false
  }
]

interface MemberContentProps {
  member: Member | null
  onMemberUpdate?: (member: Member | null) => void
  onMemberDeleted?: () => void // New callback for when a member is deleted
}

function EmptyMemberState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No member selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a member from the sidebar to view their profile and permissions
        </p>
      </div>
    </div>
  )
}

function RoleSelector({ 
  selectedRole, 
  onRoleChange, 
  disabled = false 
}: {
  selectedRole?: Role
  onRoleChange: (roleId: string) => void
  disabled?: boolean
}) {

  const getRoleIcon = (level: number) => {
    switch (level) {
      case 4: return <Crown className="h-4 w-4" />
      case 3: return <Shield className="h-4 w-4" />
      case 2: return <Edit className="h-4 w-4" />
      case 1: return <Eye className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleDisplayName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  return (
    <div className="space-y-3">
      <RadioGroup
        value={selectedRole?.name || ''}
        onValueChange={onRoleChange}
        disabled={disabled}
      >
        {systemRoles.map((role) => (
          <div key={role.name} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-blue-50">
            <RadioGroupItem value={role.name} id={role.name} className="mt-1 border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
            <div className="flex-1">
              <Label htmlFor={role.name} className="flex items-center space-x-2 cursor-pointer">
                {getRoleIcon(role.level)}
                <span className="font-medium">{getRoleDisplayName(role.name)}</span>
                <Badge variant="outline" className="text-xs">
                  Level {role.level}
                </Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {role.description}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

function SpacePermissions({ 
  member, 
  onPermissionChange, 
  disabled = false 
}: {
  member: Member
  onPermissionChange: (spaceId: string, hasAccess: boolean) => void
  disabled?: boolean
}) {
  const spaceStore = useSpaceStore()
  const [spacePermissions, setSpacePermissions] = useState<SpacePermission[]>([])

  useEffect(() => {
    // Map all spaces with current permissions using existing member data
    const permissions: SpacePermission[] = spaceStore.spaces.map(space => {
      const hasPermission = member.space_permissions?.some(perm => perm.space_id === space.id)
      return {
        space_id: space.id,
        space_name: space.name,
        space_description: space.description,
        has_access: hasPermission || false,
        role: undefined
      }
    })

    setSpacePermissions(permissions)
    console.log('Space permissions mapped from existing data:', permissions)
  }, [spaceStore.spaces, member.space_permissions])

  const handlePermissionToggle = (spaceId: string, checked: boolean) => {
    // Optimistically update the UI
    setSpacePermissions(prev => 
      prev.map(perm => 
        perm.space_id === spaceId 
          ? { ...perm, has_access: checked }
          : perm
      )
    )
    
    // Call the parent handler to actually save the change
    onPermissionChange(spaceId, checked)
  }

  return (
    <div className="space-y-3">
      {spacePermissions.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No spaces available</p>
        </div>
      ) : (
        spacePermissions.map((permission) => (
          <div key={permission.space_id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-blue-50">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium">{permission.space_name}</h4>
                {permission.role && (
                  <Badge variant="secondary" className="text-xs">
                    {typeof permission.role === 'string' ? permission.role : permission.role.name}
                  </Badge>
                )}
              </div>
              {permission.space_description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {permission.space_description}
                </p>
              )}
            </div>
            <Switch
              checked={permission.has_access}
              onCheckedChange={(checked: boolean) => handlePermissionToggle(permission.space_id, checked)}
              disabled={disabled}
              className={cn(
                "data-[state=checked]:bg-blue-600",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        ))
      )}
    </div>
  )
}

export const MemberContent = observer(({ member, onMemberUpdate, onMemberDeleted }: MemberContentProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedRoleName, setSelectedRoleName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const userStore = useUserStore()
  const spaceStore = useSpaceStore()

  // Load current user's role on mount
  useEffect(() => {
    const loadCurrentUserRole = async () => {
      if (!userStore.user?.id) return
      
      try {
        console.log('Loading current user role for:', userStore.user.id)
        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select(`
            roles (
              id,
              name,
              level,
              is_custom,
              description
            )
          `)
          .eq('user_id', userStore.user.id)
          .limit(1)
          .single()

        if (!error && userRoles?.roles) {
          setCurrentUserRole(userRoles.roles as unknown as Role)
          console.log('✅ Current user role loaded:', userRoles.roles)
        } else {
          console.log('ℹ️ No role found for current user or error:', error?.message)
          setCurrentUserRole(null)
        }
      } catch (error) {
        console.log('Could not load current user role:', error)
        setCurrentUserRole(null)
      }
    }

    loadCurrentUserRole()
  }, [userStore.user?.id])

  // Check if current user can edit this member
  const canEdit = userStore.user && userStore.user.id !== member?.id

  // Check if current user is admin or founder (can manage space permissions)
  const isNotViewingSelf = userStore.user && userStore.user.id !== member?.id
  const hasAdminRole = currentUserRole && currentUserRole.level >= 3
  const isViewingSelf = userStore.user && userStore.user.id === member?.id
  
  // Can delete user if current user is admin/founder and not viewing themselves
  const canDeleteUser = hasAdminRole && isNotViewingSelf
  
  // Allow space permission management if:
  // 1. User has admin/founder role AND viewing someone else, OR
  // 2. User has founder role (level 4) AND viewing themselves (founders can manage their own permissions)
  const canManageSpacePermissions = hasAdminRole && (
    !isViewingSelf || // Managing others (admin/founder)
    (currentUserRole && currentUserRole.level >= 4) // Founders can manage their own permissions
  )

  console.log('🔍 Updated permission check:', {
    userEmail: userStore.user?.email,
    userId: userStore.user?.id,
    memberId: member?.id,
    isNotViewingSelf,
    isViewingSelf,
    currentUserRole,
    hasAdminRole,
    canManageSpacePermissions,
    levelCheck: currentUserRole ? `${currentUserRole.level} >= 3 = ${currentUserRole.level >= 3}` : 'No role',
    founderSelfManage: currentUserRole ? `Level ${currentUserRole.level} >= 4 = ${currentUserRole.level >= 4}` : 'No role'
  })

  useEffect(() => {
    if (member?.global_role) {
      setSelectedRoleName(member.global_role.name)
    } else {
      setSelectedRoleName('')
    }
    setIsEditing(false)
    setHasChanges(false)
  }, [member])

  if (!member) {
    return <EmptyMemberState />
  }

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const displayName = member.first_name && member.last_name 
    ? `${member.first_name} ${member.last_name}`
    : member.first_name || member.email

  const handleRoleChange = (roleName: string) => {
    console.log('Role change:', roleName)
    setSelectedRoleName(roleName)
    setHasChanges(true)
  }

  const handleSpacePermissionChange = async (spaceId: string, hasAccess: boolean) => {
    if (!member) return
    
    console.log('Space permission change:', spaceId, hasAccess, 'for member:', member.id)
    
    try {
      if (hasAccess) {
        // Add space permission
        const { error } = await supabase
          .from('space_authorized_users')
          .insert({
            space_id: spaceId,
            user_id: member.id,
            authorized_by: userStore.user?.id
          })
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error('Error granting space access:', error)
          return
        }
        
        console.log('✅ Space access granted')
      } else {
        // Remove space permission
        const { error } = await supabase
          .from('space_authorized_users')
          .delete()
          .eq('space_id', spaceId)
          .eq('user_id', member.id)
        
        if (error) {
          console.error('Error revoking space access:', error)
          return
        }
        
        console.log('✅ Space access revoked')
      }
      
      // Update member data by fetching updated space permissions
      const { data: updatedSpacePerms } = await supabase
        .from('space_authorized_users')
        .select('*')
        .eq('user_id', member.id)
      
      const updatedMember = {
        ...member,
        space_permissions: updatedSpacePerms || []
      }
      
      // Update the member data
      if (onMemberUpdate) {
        onMemberUpdate(updatedMember)
      }
      
    } catch (error) {
      console.error('Error updating space permission:', error)
    }
  }

  const handleSaveChanges = async () => {
    if (!hasChanges || !member) return
    
    setIsSaving(true)
    try {
      console.log('Saving changes for member:', member.id, 'new role:', selectedRoleName)
      // TODO: Implement save logic
      setHasChanges(false)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving changes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    // Use auth_email if available (for invited users), otherwise use email
    const emailToMatch = member.auth_email || member.email
    if (!member || deleteConfirmEmail !== emailToMatch) {
      setDeleteError('Email confirmation does not match')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No session found')
      }

      // Call delete API endpoint
      const response = await fetch('/api/members/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: member.id,
          confirmationEmail: deleteConfirmEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      // Close dialog and clear selection
      setShowDeleteDialog(false)
      setDeleteConfirmEmail('')
      onMemberUpdate?.(null)
      
      // Trigger member list refresh
      onMemberDeleted?.()

    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

    return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                {getInitials(member.first_name, member.last_name, member.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{member.email}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {!isEditing && canEdit && (
              <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600 text-white rounded-full">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false)
                    setHasChanges(false)
                    setSelectedRoleName(member.global_role?.name || '')
                  }}
                  className="rounded-full px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || isSaving}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.bio && (
              <div>
                <Label className="text-sm font-medium">Bio</Label>
                <p className="text-sm text-muted-foreground mt-1">{member.bio}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Reputation Points</Label>
                <p className="text-lg font-semibold text-blue-600">{member.reputation_points || 0}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(member.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Global Role</span>
            </CardTitle>
            <CardDescription>
              Set the member's global role which determines their base permissions across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleSelector
              selectedRole={isEditing ? systemRoles.find(r => r.name === selectedRoleName) : member.global_role as Role | undefined}
              onRoleChange={handleRoleChange}
              disabled={!isEditing}
            />
          </CardContent>
        </Card>

        {/* Space Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Space Permissions</span>
            </CardTitle>
            <CardDescription>
              {canManageSpacePermissions 
                ? `✅ You can manage space permissions ${isViewingSelf ? 'for yourself' : 'for this member'}. Your role: ${currentUserRole?.name} (Level ${currentUserRole?.level})`
                : `🔒 Space permissions are read-only. ${
                    !hasAdminRole 
                      ? `Admin access required. Your role: ${currentUserRole?.name || 'None'} (Level ${currentUserRole?.level || 'N/A'})`
                      : isViewingSelf && currentUserRole?.level < 4
                        ? 'Only founders can manage their own space permissions. Admins can only manage others.'
                        : 'Permission denied for unknown reason.'
                  }`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpacePermissions
              member={member}
              onPermissionChange={handleSpacePermissionChange}
              disabled={!canManageSpacePermissions}
            />
          </CardContent>
        </Card>

          {/* Danger Zone - Delete User */}
          {canDeleteUser && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-red-600 flex items-center">
                  <Trash2 className="h-5 w-5 mr-3" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-red-700">
                  Permanently delete this user account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="mb-4">
                    <h4 className="font-medium text-red-800 mb-2">Delete User Account</h4>
                    <p className="text-sm text-red-700">
                      This will permanently delete <strong>{member.first_name ? `${member.first_name} ${member.last_name}` : member.email}</strong>'s 
                      account, including their profile, roles, and all associated data.
                    </p>
                  </div>
                  
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="rounded-full px-6 bg-red-500 hover:bg-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete User Account</DialogTitle>
                        <DialogDescription>
                          This action will permanently delete {member.first_name || member.email}'s account 
                          and all associated data. This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {deleteError && (
                          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                            <AlertDescription>{deleteError}</AlertDescription>
                          </Alert>
                        )}
                        <div>
                          <Label htmlFor="deleteConfirm">
                            Type the user's email address to confirm: <strong>{member.auth_email || member.email}</strong>
                          </Label>
                          <Input
                            id="deleteConfirm"
                            type="email"
                            value={deleteConfirmEmail}
                            onChange={(e) => {
                              setDeleteConfirmEmail(e.target.value)
                              setDeleteError(null)
                            }}
                            placeholder={member.auth_email || member.email}
                            className="mt-1 rounded-lg border-gray-200 focus:border-red-500 focus:ring-red-500"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteDialog(false)
                              setDeleteConfirmEmail('')
                              setDeleteError(null)
                            }}
                            className="rounded-full px-6"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={deleteConfirmEmail !== (member.auth_email || member.email) || isDeleting}
                            className="rounded-full px-6 bg-red-500 hover:bg-red-600"
                          >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? 'Deleting...' : 'Delete User'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}) 

 