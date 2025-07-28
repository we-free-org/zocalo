import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    // Get the authenticated user from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract space ID from file path (format: spaceId/filename)
    const spaceId = filePath.split('/')[0]
    
    // Check if user has access to this space
    const { data: accessCheck, error: accessError } = await supabase
      .from('space_authorized_users')
      .select('id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single()
    
    if (accessError || !accessCheck) {
      return NextResponse.json({ error: 'Access denied to this file' }, { status: 403 })
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('files')
      .createSignedUrl(filePath, 3600) // 1 hour

    if (urlError) {
      console.error('Error generating signed URL:', urlError)
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    return NextResponse.json({ 
      signedUrl: signedUrlData.signedUrl,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('Exception in signed URL generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 