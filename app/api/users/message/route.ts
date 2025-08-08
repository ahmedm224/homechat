import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recipientId, rawMessage, context } = await request.json()
    if (!recipientId || !rawMessage) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const modelName = process.env.OPENAI_MODEL_NAME
    if (!modelName) return NextResponse.json({ error: 'OPENAI_MODEL_NAME is not set' }, { status: 400 })

    let refined = ''
    const prompt = `You are an assistant that rewrites a message from User A to User B to be clear, concise, polite, and helpful. Include only the final message body, no preface.\n\nContext (optional): ${context || 'N/A'}\n\nOriginal Message from A:\n${rawMessage}`
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

    const { error } = await supabase.from('user_messages').insert([
      { sender_id: user.id, recipient_id: recipientId, content: refined },
    ])
    if (error) return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

