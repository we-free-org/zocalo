import { NextRequest, NextResponse } from 'next/server'
import { decryptMessage } from '@/lib/encryption'
import { supabase } from '@/lib/supabase/client'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages must be an array' },
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
    console.log('Decrypt API: Encryption key hash (first 8 chars):', keyHash)
    console.log('Decrypt API: Processing', messages.length, 'messages')

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
          console.log(`Attempting to decrypt message ${msg.id}, content length: ${msg.content.length}`)
          const decryptedContent = decryptMessage(msg.content)
          console.log(`Successfully decrypted message ${msg.id}, decrypted length: ${decryptedContent.length}`)
          return {
            ...msg,
            content: decryptedContent
          }
        }
        // Return unencrypted messages as-is
        return msg
      } catch (error) {
        console.error(`Failed to decrypt message ${msg.id}:`, error)
        console.error(`Message details - ID: ${msg.id}, encryption_type: ${msg.encryption_type}, content_length: ${msg.content?.length || 0}`)
        // Return with decryption error indicator
        return {
          ...msg,
          content: '[Unable to decrypt message]',
          decryption_error: true
        }
      }
    })

    const successCount = decryptedMessages.filter(msg => !msg.decryption_error).length
    const errorCount = decryptedMessages.filter(msg => msg.decryption_error).length
    
    console.log(`Decrypt API: Completed processing. Success: ${successCount}, Errors: ${errorCount}`)

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