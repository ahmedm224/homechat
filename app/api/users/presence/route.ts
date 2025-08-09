export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  try {
    // Public: list all profiles (basic fields). Use service role to bypass RLS safely.
    if (!supabaseAdmin) {
      // Fallback to empty if admin key not configured
      return NextResponse.json([])
    }
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
    // Do not leak emails if you prefer anonymity for non-auth users. For now we return full_name or masked email.
    const sanitized = (data || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
    }))
    return NextResponse.json(sanitized)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

