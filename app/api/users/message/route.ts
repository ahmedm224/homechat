import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { recipientId, rawMessage, context, fromName } = await request.json()
    if (!recipientId || !rawMessage) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const modelName = process.env.OPENAI_MODEL_NAME
    if (!modelName) return NextResponse.json({ error: 'OPENAI_MODEL_NAME is not set' }, { status: 400 })

    // Fetch sender profile for nice name
    let senderName = fromName?.toString().trim() || ''
    if (user) {
      const { data: senderProfile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()
      senderName = senderProfile?.full_name || senderProfile?.email || senderName
    }
    if (!senderName) senderName = 'Someone'

    // Rewrite via AI
    let refined = ''
    const prompt = `Rewrite the following message to be delivered from ${senderName} to the recipient. Be clear, concise, polite, and keep the original meaning. Output only the final message body without quotes.\n\nContext (optional): ${context || 'N/A'}\n\nOriginal message:\n${rawMessage}`
    try {
      if (modelName.toLowerCase().startsWith('gpt-5')) {
        const resp: any = await openai.responses.create({ model: modelName, input: prompt })
        refined = resp?.output_text || resp?.choices?.[0]?.message?.content || ''
      } else {
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: 'Rewrite the user message to be clear, concise, and polite. Output only the message.' },
            { role: 'user', content: prompt },
          ] as any,
        })
        refined = completion.choices?.[0]?.message?.content || ''
      }
    } catch (err) {
      return NextResponse.json({ error: 'Model error' }, { status: 500 })
    }

    if (!refined.trim()) refined = rawMessage

    // Save to user_messages and also surface in recipient's chat list
    const insertClient = supabaseAdmin ?? supabase
    const { error } = await insertClient.from('user_messages').insert([
      { sender_id: user?.id || null, recipient_id: recipientId, content: refined, sender_name: senderName },
    ])
    if (error) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })

    // Also write to the recipient's chat history as an assistant message, prefixed by sender name
    if (supabaseAdmin) {
      const { data: existingChat } = await supabaseAdmin
        .from('chats')
        .select('id')
        .eq('user_id', recipientId)
        .eq('title', 'Messages')
        .maybeSingle()

      let chatId = existingChat?.id as string | undefined
      if (!chatId) {
        const { data: newChat } = await supabaseAdmin
          .from('chats')
          .insert([{ user_id: recipientId, title: 'Messages' }])
          .select('id')
          .single()
        chatId = newChat?.id
      }

      if (chatId) {
        await supabaseAdmin
          .from('messages')
          .insert([{ chat_id: chatId, role: 'assistant', content: `${senderName}: ${refined}` }])
        await supabaseAdmin
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

