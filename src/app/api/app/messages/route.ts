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

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const conversationId = searchParams.get('conversationId')

    if (!channelId && !conversationId) {
      return NextResponse.json({ error: 'Channel ID or Conversation ID is required' }, { status: 400 })
    }

    // Build query based on type
    const filterField = channelId ? 'channel_id' : 'conversation_id'
    const filterId = channelId || conversationId

    // Get messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        encryption_type,
        status,
        user_id,
        profiles:user_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq(filterField, filterId)
      .in('status', ['approved', 'deleted'])
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Transform messages to match expected format
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      is_edited: msg.is_edited,
      edited_at: msg.edited_at,
      encryption_type: msg.encryption_type,
      status: msg.status,
      user: {
        id: msg.profiles?.id || msg.user_id,
        first_name: msg.profiles?.first_name,
        last_name: msg.profiles?.last_name,
        avatar_url: msg.profiles?.avatar_url
      }
    }))

    return NextResponse.json({
      success: true,
      messages: formattedMessages
    })

  } catch (error) {
    console.error('Exception in messages GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { content, channelId, conversationId } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (!channelId && !conversationId) {
      return NextResponse.json({ error: 'Channel ID or Conversation ID is required' }, { status: 400 })
    }

    // Create message
    const messageData: any = {
      content: content.trim(),
      user_id: user.id,
      encryption_type: 'none', // TODO: Implement encryption if needed
      status: 'approved'
    }

    if (channelId) {
      messageData.channel_id = channelId
    } else {
      messageData.conversation_id = conversationId
    }

    const { data: message, error: createError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating message:', createError)
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
    }

    // Format response
    const formattedMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      user: {
        id: (message as any).profiles?.id || message.user_id,
        first_name: (message as any).profiles?.first_name,
        last_name: (message as any).profiles?.last_name,
        avatar_url: (message as any).profiles?.avatar_url
      }
    }

    return NextResponse.json({
      success: true,
      message: formattedMessage
    })

  } catch (error) {
    console.error('Exception in messages POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const { messageId, content } = await request.json()

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'Message ID and content are required' }, { status: 400 })
    }

    // Update message (only if user owns it)
    const { data: message, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating message:', updateError)
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Exception in messages PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    // Mark message as deleted (soft delete)
    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .update({
        status: 'deleted',
        deleted_by: user.id,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Exception in messages DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 