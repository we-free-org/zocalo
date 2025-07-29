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

    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 })
    }

    // Check if requesting user has at least member privileges
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_id')
      .eq('user_id', requestingUser.id)

    if (!userRoles || userRoles.length === 0) {
      return NextResponse.json({ 
        error: 'Access denied. Member privileges required.' 
      }, { status: 403 })
    }

    // Fetch emails for the requested user IDs
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 })
    }

    // Create a map of user ID to email for the requested users
    const emails: Record<string, string> = {}
    
    users.forEach(user => {
      if (userIds.includes(user.id) && user.email) {
        emails[user.id] = user.email
      }
    })

    return NextResponse.json({ 
      success: true, 
      emails 
    })

  } catch (error) {
    console.error('Exception in emails API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 