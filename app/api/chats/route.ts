import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching chats:', error)
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
    }

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error in GET /api/chats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await request.json()

    const { data: chat, error } = await supabase
      .from('chats')
      .insert([
        {
          user_id: user.id,
          title: title || 'New Chat'
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating chat:', error)
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
    }

    return NextResponse.json(chat)
  } catch (error) {
    console.error('Error in POST /api/chats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 