import { NextRequest, NextResponse } from 'next/server'
import { encryptMessage } from '@/lib/encryption'
import { supabase } from '@/lib/supabase/client'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      )
    }

    // Check if encryption key is available
    if (!process.env.ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY environment variable is not set')
      return NextResponse.json(
        { error: 'Server encryption configuration error' },
        { status: 500 }
      )
    }
    
    // Debug: Log encryption key hash to verify consistency across environments
    const keyHash = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest('hex').substring(0, 8)
    console.log('Encrypt API: Encryption key hash (first 8 chars):', keyHash)
    console.log('Encrypt API: Encrypting content with length:', content.length)

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
    console.log('Encrypt API: Successfully encrypted, output length:', encryptedContent.length)

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