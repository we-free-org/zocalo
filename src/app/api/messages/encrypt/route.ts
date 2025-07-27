import { NextRequest, NextResponse } from 'next/server'
import { encryptMessage } from '@/lib/encryption'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Encrypt the message content
    const encryptedContent = encryptMessage(content)

    return NextResponse.json({
      encryptedContent,
      encryptionType: 'instance_key'
    })

  } catch (error) {
    console.error('Encryption API error:', error)
    return NextResponse.json(
      { error: 'Failed to encrypt message' },
      { status: 500 }
    )
  }
} 