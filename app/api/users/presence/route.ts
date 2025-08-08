import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json([])

    // Return list of users (profiles) with basic info
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .neq('id', user.id)
      .limit(50)
    if (error) {
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

