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

export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify the requesting user with Supabase
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, confirmationEmail } = await request.json()

    if (!userId || !confirmationEmail) {
      return NextResponse.json({ error: 'User ID and confirmation email are required' }, { status: 400 })
    }

    // Check if requesting user has admin/founder privileges
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', requestingUser.id)

    if (roleError || !userRoles || userRoles.length === 0) {
      console.error('Error fetching user roles:', roleError)
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required to delete users.' 
      }, { status: 403 })
    }

    // Get role details for the user's roles
    const roleIds = userRoles.map(ur => ur.role_id)
    const { data: roles, error: rolesDetailError } = await supabaseAdmin
      .from('roles')
      .select('level, name')
      .in('id', roleIds)

    if (rolesDetailError || !roles || roles.length === 0) {
      console.error('Error fetching role details:', rolesDetailError)
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required to delete users.' 
      }, { status: 403 })
    }

    // Find the highest level role
    const maxLevel = Math.max(...roles.map(r => r.level))

    if (maxLevel < 3) {
      return NextResponse.json({ 
        error: `Access denied. Admin privileges required to delete users. Your highest role level: ${maxLevel}` 
      }, { status: 403 })
    }

    console.log(`User ${requestingUser.email} has highest role level ${maxLevel} - deletion authorized`)

    // Get the user to be deleted to verify email
    const { data: { user: userToDelete }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError || !userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify email confirmation (use auth email which is the actual email)
    if (confirmationEmail !== userToDelete.email) {
      return NextResponse.json({ error: 'Email confirmation does not match' }, { status: 400 })
    }

    // Prevent users from deleting themselves (should use /api/user/delete)
    if (requestingUser.id === userId) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account through this endpoint. Use profile settings instead.' 
      }, { status: 400 })
    }

    // Delete the user - this will trigger cascade deletes for profiles, user_roles, etc.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
    }

    console.log(`User ${userToDelete.email} deleted by admin ${requestingUser.email}`)

    return NextResponse.json({ 
      success: true, 
      message: 'User account deleted successfully' 
    })

  } catch (error) {
    console.error('Exception in delete member API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 