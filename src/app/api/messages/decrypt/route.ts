import { NextRequest, NextResponse } from 'next/server'
import { decryptMessage } from '@/lib/encryption'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
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

    // Decrypt messages that need decryption
    const decryptedMessages = messages.map((msg: { id: string; content: string; encryption_type: string; [key: string]: unknown }) => {
      try {
        if (msg.encryption_type === 'instance_key' && msg.content) {
          return {
            ...msg,
            content: decryptMessage(msg.content)
          }
        }
        // Return unencrypted messages as-is
        return msg
      } catch (error) {
        console.error(`Failed to decrypt message ${msg.id}:`, error)
        // Return with decryption error indicator
        return {
          ...msg,
          content: '[Unable to decrypt message]',
          decryption_error: true
        }
      }
    })

    return NextResponse.json({
      messages: decryptedMessages
    })

  } catch (error) {
    console.error('Decryption API error:', error)
    return NextResponse.json(
      { error: 'Failed to decrypt messages' },
      { status: 500 }
    )
  }
} 