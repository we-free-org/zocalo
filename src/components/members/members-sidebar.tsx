'use client'

import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Search, Users, UserPlus, Mail, Clock, CheckCircle, XCircle, Plus, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { supabase } from '@/lib/supabase/client'
import { useUserStore } from '@/stores'
import { cn } from '@/lib/utils'
import { Member, InviteRequest, PendingInvite, TabType } from './types'

interface MembersSidebarProps {
  selectedMember: Member | null
  onMemberSelect: (member: Member | null) => void
  refreshTrigger?: number // Trigger to refresh the member list
}

function AddMemberDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [roles, setRoles] = useState<Array<{id: string, name: string, description: string, level: number}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const userStore = useUserStore()

  // Load available roles when dialog opens
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { data: rolesData, error } = await supabase
          .from('roles')
          .select('id, name, description, level')
          .eq('is_custom', false)
          .order('level', { ascending: false })

        if (error) {
          console.error('Failed to load roles:', error)
          return
        }

        setRoles(rolesData || [])
      } catch (error) {
        console.error('Error loading roles:', error)
      }
    }

    if (isOpen) {
      loadRoles()
    }
  }, [isOpen])

  const handleInvite = async () => {
    if (!email.trim()) return
    
    setIsLoading(true)
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('No session token available')
        return
      }

      // Use Supabase admin to invite user
      const response = await fetch('/api/members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: email.trim(),
          message: message.trim(),
          role: selectedRole
        })
      })

      if (response.ok) {
        setEmail('')
        setMessage('')
        setSelectedRole('viewer')
        setIsOpen(false)
        // TODO: Refresh pending invites list
      } else {
        const error = await response.text()
        console.error('Failed to invite user:', error)
      }
    } catch (error) {
      console.error('Error inviting user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-4">
          <Plus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to the platform.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-base font-medium">Assign Role</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose what level of access this member will have
            </p>
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="space-y-3">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value={role.name} id={role.name} />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={cn(
                      "p-2 rounded-full",
                      role.level === 4 && "bg-purple-100 text-purple-600",
                      role.level === 3 && "bg-orange-100 text-orange-600", 
                      role.level === 2 && "bg-blue-100 text-blue-600",
                      role.level === 1 && "bg-gray-100 text-gray-600"
                    )}>
                      {role.level >= 3 ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={role.name} className="font-medium capitalize cursor-pointer">
                        {role.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                    <Badge variant={role.level >= 3 ? "default" : "secondary"} className="text-xs">
                      Level {role.level}
                    </Badge>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="message">Invitation Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to the invitation"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-full px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleInvite}
              disabled={!email.trim() || isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-6"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MemberItem({ member, isSelected, onClick }: {
  member: Member
  isSelected: boolean
  onClick: () => void
}) {
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

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.avatar_url} />
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {getInitials(member.first_name, member.last_name, member.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {member.email}
        </p>
        {member.global_role && (
          <Badge variant="secondary" className="text-xs mt-1">
            {member.global_role.name}
          </Badge>
        )}
      </div>
    </div>
  )
}

function InviteRequestItem({ invite, onApprove, onReject }: {
  invite: InviteRequest
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
          <Mail className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {invite.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Requested {new Date(invite.created_at).toLocaleDateString()}
          </p>
          {invite.message && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              "{invite.message}"
            </p>
          )}
        </div>
      </div>
      <div className="flex space-x-1">
        <Button size="sm" variant="outline" onClick={onApprove} className="h-8 px-2">
          <CheckCircle className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} className="h-8 px-2">
          <XCircle className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function PendingInviteItem({ invite }: { invite: PendingInvite }) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border">
      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
        <Clock className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {invite.email}
        </p>
        <p className="text-xs text-muted-foreground">
          Invited {new Date(invite.created_at).toLocaleDateString()}
          {invite.invited_by_name && ` by ${invite.invited_by_name}`}
        </p>
        <Badge variant="outline" className="text-xs mt-1">
          Pending
        </Badge>
      </div>
    </div>
  )
}

export const MembersSidebar = observer(({ selectedMember, onMemberSelect, refreshTrigger }: MembersSidebarProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [inviteRequests, setInviteRequests] = useState<InviteRequest[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const userStore = useUserStore()

  // Check if user can manage members (admin or founder)
  const canManageMembers = userStore.profile && userStore.user // TODO: Add role check

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      if (!userStore.user) return
      
      setIsLoading(true)
      try {
        // Load basic profiles first
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('first_name', { ascending: true })

        if (profilesError) {
          console.error('Error loading profiles:', profilesError)
          return
        }

        console.log('Loaded profiles:', profiles)

        // Get auth emails for all users using admin client
        const { data: { session } } = await supabase.auth.getSession()
        let authEmails: Record<string, string> = {}
        
        if (session?.access_token) {
          try {
            const response = await fetch('/api/members/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                userIds: (profiles || []).map(p => p.id)
              })
            })
            
            if (response.ok) {
              const emailData = await response.json()
              authEmails = emailData.emails || {}
            }
          } catch (error) {
            console.error('Failed to fetch auth emails:', error)
          }
        }

        // Now try to load user roles for each profile
        const profilesWithRoles = await Promise.all((profiles || []).map(async (profile) => {
          try {
            // Load user role (note: users can have different roles in different spaces, we'll get the first one)
            const { data: userRoles, error: rolesError } = await supabase
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
              .eq('user_id', profile.id)
              .limit(1)
              .single()

            // Load space authorizations
            const { data: spacePerms, error: spaceError } = await supabase
              .from('space_authorized_users')
              .select('*')
              .eq('user_id', profile.id)

            const globalRole = !rolesError && userRoles?.roles ? userRoles.roles : undefined
            const spacePermissions = !spaceError && spacePerms ? spacePerms : []

            // Use auth email if available, fallback to profile email or unknown
            const authEmail = authEmails[profile.id] || profile.email || 'email@unknown.com'

            console.log(`Profile ${profile.id}:`, {
              profile,
              authEmail,
              globalRole,
              spacePermissions,
              rolesError: rolesError?.message,
              spaceError: spaceError?.message
            })

            return {
              ...profile,
              email: authEmail,
              auth_email: authEmail, // Store separately for deletion confirmation
              global_role: globalRole,
              space_permissions: spacePermissions
            }
          } catch (error) {
            console.log(`Error loading additional data for profile ${profile.id}:`, error)
            return {
              ...profile,
              email: profile.id === userStore.user?.id ? userStore.user.email || '' : profile.email || 'email@hidden.com',
              global_role: undefined,
              space_permissions: []
            }
          }
        }))

        console.log('Final members with roles:', profilesWithRoles)
        setMembers(profilesWithRoles as Member[])
      } catch (error) {
        console.error('Error loading members:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
  }, [userStore.user, refreshTrigger])

  // Load invite requests and pending invites
  useEffect(() => {
    const loadInvites = async () => {
      if (!userStore.user || !canManageMembers) return

      try {
        // Check if invite_requests table exists by trying to load from it
        const { data: requestsData, error: requestsError } = await supabase
          .from('invite_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (!requestsError && requestsData) {
          setInviteRequests(requestsData)
        } else if (requestsError?.code === 'PGRST106' || requestsError?.code === '42P01') {
          // Table doesn't exist - this is expected if migration hasn't been run
          console.log('invite_requests table not found - migration may not be applied yet')
          setInviteRequests([])
        } else if (requestsError) {
          console.log('Invite requests table exists but no data or other error:', requestsError.message || 'Unknown error')
          setInviteRequests([])
        }

        // TODO: Load pending invites from auth.users where email_confirmed_at is null
      } catch (error) {
        console.log('Error loading invites (gracefully handled):', error)
        setInviteRequests([])
      }
    }

    loadInvites()
  }, [userStore.user, canManageMembers])

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.email.toLowerCase().includes(query) ||
      member.first_name?.toLowerCase().includes(query) ||
      member.last_name?.toLowerCase().includes(query)
    )
  })

  const handleApproveRequest = async (requestId: string) => {
    // TODO: Implement approve request logic
    console.log('Approve request:', requestId)
  }

  const handleRejectRequest = async (requestId: string) => {
    // TODO: Implement reject request logic
    console.log('Reject request:', requestId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Members</h1>
          {canManageMembers && <AddMemberDialog />}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-11 pr-4"
          />
        </div>

        {/* Tabs */}
        <div className="flex mt-4 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'members' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('members')}
            className={cn(
              "flex-1",
              activeTab === 'members' && "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Users className="h-4 w-4 mr-1" />
            Members ({filteredMembers.length})
          </Button>
          <Button
            variant={activeTab === 'invites' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('invites')}
            className={cn(
              "flex-1",
              activeTab === 'invites' && "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Mail className="h-4 w-4 mr-1" />
            Invites ({inviteRequests.length})
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'members' ? (
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No members found' : 'No members yet'}
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  isSelected={selectedMember?.id === member.id}
                  onClick={() => onMemberSelect(member)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Invite Requests */}
            {inviteRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Invite Requests ({inviteRequests.length})
                </h3>
                <div className="space-y-2">
                  {inviteRequests.map((request) => (
                    <InviteRequestItem
                      key={request.id}
                      invite={request}
                      onApprove={() => handleApproveRequest(request.id)}
                      onReject={() => handleRejectRequest(request.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Pending Invites ({pendingInvites.length})
                </h3>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <PendingInviteItem key={invite.id} invite={invite} />
                  ))}
                </div>
              </div>
            )}

            {inviteRequests.length === 0 && pendingInvites.length === 0 && (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No pending invites</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}) 