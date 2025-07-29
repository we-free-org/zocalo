import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email, message, role = 'viewer' } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Check if user has permission to invite members (admin/founder role)
    // For now, allow any authenticated user to invite

    try {
      // Step 1: Generate invite link using admin API
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: email.toLowerCase().trim(),
        options: {
          data: {
            invited_by: user.id,
            invite_message: message || null,
            role: role // Role selected during invite
          },
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/complete-profile`
        }
      })

      if (inviteError) {
        console.error('Supabase invite error:', inviteError)
        
        // Handle specific error cases
        if (inviteError.message.includes('already registered')) {
          return NextResponse.json(
            { error: 'User with this email is already registered' }, 
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: inviteError.message || 'Failed to send invitation' }, 
          { status: 400 }
        )
      }

      // Step 2: Find the created user by email
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (usersError) {
        console.error('Error fetching users:', usersError)
        return NextResponse.json(
          { error: 'Failed to process invitation' }, 
          { status: 500 }
        )
      }

      const invitedUser = users.find(u => u.email === email.toLowerCase().trim())
      
      if (!invitedUser) {
        console.error('Invited user not found after creation')
        return NextResponse.json(
          { error: 'Failed to process invitation' }, 
          { status: 500 }
        )
      }

      // Step 3: Assign the selected role to the user
      try {
        // Get the role ID
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('name', role)
          .single()

        if (roleError || !roleData) {
          console.error('Failed to find role:', role, roleError)
          // Continue without role assignment - user can be assigned later
        } else {
          // Get General space
          const { data: spaceData, error: spaceError } = await supabaseAdmin
            .from('spaces')
            .select('id')
            .ilike('name', 'general')
            .single()

          if (spaceError || !spaceData) {
            console.error('Failed to find General space:', spaceError)
          } else {
            // Assign role in General space
            const { error: roleAssignError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: invitedUser.id,
                role_id: roleData.id,
                space_id: spaceData.id,
                assigned_by: user.id,
                assigned_at: new Date().toISOString()
              })

            if (roleAssignError) {
              console.error('Failed to assign role:', roleAssignError)
            }

            // Add to space_authorized_users
            const { error: spaceAuthError } = await supabaseAdmin
              .from('space_authorized_users')
              .insert({
                space_id: spaceData.id,
                user_id: invitedUser.id,
                authorized_by: user.id,
                authorized_at: new Date().toISOString()
              })

            if (spaceAuthError) {
              console.error('Failed to authorize user for space:', spaceAuthError)
            }
          }
        }
      } catch (roleAssignmentError) {
        console.error('Exception during role assignment:', roleAssignmentError)
        // Continue - the invitation was sent successfully
      }

      console.log('Invitation sent successfully with role assignment:', inviteData)

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        invitedUser: {
          id: invitedUser.id,
          email: invitedUser.email
        }
      })

    } catch (inviteErr) {
      console.error('Exception during invitation:', inviteErr)
      return NextResponse.json(
        { error: 'Failed to send invitation' }, 
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Exception in invite API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 