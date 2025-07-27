import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface SetupRequestBody {
  instanceName: string
  instanceDomain: string
  adminEmail: string
  adminPassword: string
  adminFirstName: string
  adminLastName: string
  allowPublicSignup: boolean
  requireEmailConfirmation: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Check if any users exist - if so, setup should not be accessible
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 })
    if (users?.users?.length > 0) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      )
    }

    const body: SetupRequestBody = await request.json()
    
    // Validate required fields
    const requiredFields = [
      'instanceName',
      'instanceDomain', 
      'adminEmail',
      'adminPassword',
      'adminFirstName',
      'adminLastName'
    ]
    
    for (const field of requiredFields) {
      if (!body[field as keyof SetupRequestBody]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Check if setup has already been completed
    const { data: setupCompleted } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'setup_completed')
      .eq('scope', 'global')
      .single()

    if (setupCompleted?.value === true) {
      return NextResponse.json(
        { error: 'Setup has already been completed' },
        { status: 400 }
      )
    }

    // Create the admin user using Supabase Admin API
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: body.adminEmail,
      password: body.adminPassword,
      email_confirm: true, // Skip email confirmation for admin
      user_metadata: {
        first_name: body.adminFirstName,
        last_name: body.adminLastName,
      }
    })

    if (userError || !user.user) {
      console.error('Error creating admin user:', userError)
      return NextResponse.json(
        { error: 'Failed to create admin user: ' + userError?.message },
        { status: 400 }
      )
    }

    // Create a "General" space for the organization
    // Note: The database trigger will automatically assign founder role to the creator
    const { data: space, error: spaceError } = await supabaseAdmin
      .from('spaces')
      .insert({
        name: 'General',
        description: 'Initial space for ' + body.instanceName,
        created_by: user.user.id
      })
      .select()
      .single()

    if (spaceError || !space) {
      console.error('Error creating default space:', spaceError)
      return NextResponse.json(
        { error: 'Failed to create default space' },
        { status: 500 }
      )
    }

    // Founder role is automatically assigned by the on_space_created trigger

    // Add user to space_authorized_users to ensure they can access the space
    const { error: authUserError } = await supabaseAdmin
      .from('space_authorized_users')
      .insert({
        space_id: space.id,
        user_id: user.user.id,
        authorized_by: user.user.id
      })

    if (authUserError) {
      console.error('Error adding user to space_authorized_users:', authUserError)
      return NextResponse.json(
        { error: 'Failed to authorize user for space' },
        { status: 500 }
      )
    }

    // Update global settings
    const settingsUpdates = [
      { key: 'instance_name', value: JSON.stringify(body.instanceName) },
      { key: 'instance_domain', value: JSON.stringify(body.instanceDomain) },
      { key: 'allow_public_signup', value: JSON.stringify(body.allowPublicSignup) },
      { key: 'require_email_confirmation', value: JSON.stringify(body.requireEmailConfirmation) },
      { key: 'setup_completed', value: JSON.stringify(true) }
    ]

    for (const setting of settingsUpdates) {
      const { error: settingError } = await supabaseAdmin
        .from('settings')
        .upsert({
          key: setting.key,
          value: setting.value,
          scope: 'global',
          created_by: user.user.id
        }, {
          onConflict: 'key,scope,scope_id'
        })

      if (settingError) {
        console.error(`Error updating setting ${setting.key}:`, settingError)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Setup completed successfully',
      user: {
        id: user.user.id,
        email: user.user.email
      }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 