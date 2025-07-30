import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Type definitions are handled with Record<string, unknown> for flexibility

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

export async function GET(request: NextRequest) {
  try {
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

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Get user's roles first
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role_id, space_id')
      .eq('user_id', user.id)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    let spaces: Array<{
      id: string
      name: string
      description: string | null
      created_at: string
      user_role: string
    }> = []

    if (userRoles && userRoles.length > 0) {
      // Get spaces for the user
      const spaceIds = userRoles.map(role => role.space_id)
      const { data: spacesData, error: spacesError } = await supabaseAdmin
        .from('spaces')
        .select('id, name, description, created_at')
        .in('id', spaceIds)

      if (spacesError) {
        console.error('Error fetching spaces:', spacesError)
        return NextResponse.json({ error: 'Failed to fetch user spaces' }, { status: 500 })
      }

      // Get roles data
      const roleIds = userRoles.map(role => role.role_id)
      const { data: rolesData, error: rolesDataError } = await supabaseAdmin
        .from('roles')
        .select('id, name')
        .in('id', roleIds)

      if (rolesDataError) {
        console.error('Error fetching roles:', rolesDataError)
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
      }

      // Transform and combine the data
      spaces = userRoles.map(userRole => {
        const space = spacesData?.find(s => s.id === userRole.space_id)
        const role = rolesData?.find(r => r.id === userRole.role_id)
        
        return {
          id: space?.id || '',
          name: space?.name || '',
          description: space?.description || null,
          created_at: space?.created_at || '',
          user_role: role?.name || ''
        }
      }).filter(space => space.id) // Filter out any spaces that weren't found
    }

    // Get instance settings
    const { data: instanceSettings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .eq('scope', 'global')
      .in('key', ['instance_name', 'allow_public_signup'])

    const settings = instanceSettings?.reduce((acc, setting: Record<string, unknown>) => {
      const key = setting.key as string;
      let value = setting.value
      try {
        // Try to parse JSON values
        if (typeof value === 'string') {
          value = JSON.parse(value)
        }
      } catch {
        // Keep original value if not JSON
      }
      acc[key] = value
      return acc
    }, {} as Record<string, unknown>) || {}

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at !== null,
        ...profile
      },
      spaces,
      settings: {
        instanceName: settings.instance_name || 'Zocalo',
        allowPublicSignup: settings.allow_public_signup || false
      }
    })

  } catch (error) {
    console.error('Exception in user profile API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 