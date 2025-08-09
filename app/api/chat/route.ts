export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    const contentType = request.headers.get('content-type') || ''
    let chatId: string | undefined
    let messageContent = ''
    let files: File[] = []
    let reasoningEffort: 'minimal' | 'medium' | undefined
    let history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const cid = formData.get('chatId')
      chatId = cid ? String(cid) : undefined
      const msg = formData.get('message')
      messageContent = msg ? String(msg) : ''
      const historyStr = formData.get('history')
      if (historyStr) {
        try {
          history = JSON.parse(String(historyStr))
        } catch {}
      }
      const effort = formData.get('reasoningEffort')
      if (effort && (effort === 'minimal' || effort === 'medium')) {
        reasoningEffort = effort
      }
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter((f): f is File => f instanceof File)
    } else {
      const { chatId: cid, message, history: historyJson, reasoningEffort: effort } = await request.json()
      chatId = cid
      messageContent = message?.content || ''
      history = Array.isArray(historyJson) ? historyJson : []
      if (effort && (effort === 'minimal' || effort === 'medium')) {
        reasoningEffort = effort
      }
    }

    // If user is authenticated and no chatId provided, create a new chat to persist
    let createdChat: { id: string; title: string } | null = null
    if (user && !chatId) {
      const { data: newChat, error: createChatError } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, title: 'New Chat' }])
        .select('id, title')
        .single()
      if (createChatError) {
        console.error('Error creating chat:', createChatError)
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      chatId = newChat.id
      createdChat = newChat
    }

    // If a chatId was provided, ensure it belongs to the user
    if (user && chatId) {
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, title, user_id')
        .eq('id', chatId)
        .single()
      if (chatError || !chat || chat.user_id !== user.id) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      }
    }

    // Prepare history for OpenAI
    let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (user && chatId) {
      const { data: dbHistory, error: historyError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(10)
      if (!historyError && dbHistory) {
        chatHistory = dbHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      }
    } else if (history && history.length > 0) {
      chatHistory = history.filter(h => h.role === 'user' || h.role === 'assistant').slice(-10) as any
    }

    // Build user content, possibly with images
    const attachmentUrls: string[] = []

    // Save user message (and attachments) if authenticated and chatId exists
    let userMessage: any = null
    if (user && chatId) {
      const { data: insertedUserMessage, error: userMessageError } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, role: 'user', content: messageContent }])
        .select()
        .single()
      if (userMessageError) {
        console.error('Error saving user message:', userMessageError)
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
      }
      userMessage = insertedUserMessage

      // Handle file uploads only for authenticated users
      if (files.length > 0) {
        for (const file of files) {
          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
          const path = `${user.id}/${chatId}/${userMessage.id}/${Date.now()}_${safeName}`
          const uploadRes = await supabase.storage
            .from('attachments')
            .upload(path, file, { contentType: file.type })
          if (uploadRes.error) {
            console.error('Error uploading file:', uploadRes.error)
            continue
          }
          const { data: publicUrlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(path)
          const fileUrl = publicUrlData.publicUrl
          attachmentUrls.push(fileUrl)
          await supabase.from('attachments').insert([
            {
              message_id: userMessage.id,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              file_url: fileUrl,
            },
          ])
        }
      }
    }

    const modelName = process.env.OPENAI_MODEL_NAME
    if (!modelName) {
      return NextResponse.json({ error: 'OPENAI_MODEL_NAME is not set' }, { status: 400 })
    }

    // Build a safe, text-only prompt compatible across models
    const systemPrompt = 'You are a helpful AI assistant. Be concise and helpful in your responses.'
    const historyText = chatHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')
    const attachmentNote = attachmentUrls.length > 0
      ? `\n\nAttached files (URLs):\n${attachmentUrls.join('\n')}`
      : ''
    const userPrompt = `${messageContent}${attachmentNote}`

    // Streaming response
    const encoder = new TextEncoder()
    let fullText = ''
    const body = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        try {
          if (modelName.toLowerCase().startsWith('gpt-5')) {
            const transcript = `System: ${systemPrompt}`
              + (historyText ? `\n\n${historyText}` : '')
              + `\n\nUser: ${userPrompt}`
            const stream: any = await openai.responses.create({
              model: modelName,
              input: transcript,
              stream: true,
              ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
            })
            for await (const event of stream) {
              // response.output_text.delta contains incremental text tokens
              if (event.type === 'response.output_text.delta') {
                const delta = event.delta as string
                if (delta) {
                  fullText += delta
                  controller.enqueue(encoder.encode(delta))
                }
              }
            }
          } else {
            const stream: any = await openai.chat.completions.create({
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                ...chatHistory,
                { role: 'user', content: userPrompt },
              ] as any,
              stream: true,
            })
            for await (const part of stream) {
              const delta = part?.choices?.[0]?.delta?.content ?? ''
              if (delta) {
                fullText += delta
                controller.enqueue(encoder.encode(delta))
              }
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || 'Unknown error'
          const errData = err?.response?.data || err?.data
          console.error('OpenAI error:', errMsg, errData)
          controller.error(err)
          return
        }

        // Persist assistant message if applicable
        try {
          if (user && chatId) {
            const { error: assistantMessageError } = await supabase
              .from('messages')
              .insert([{ chat_id: chatId, role: 'assistant', content: fullText || ' ' }])
            if (assistantMessageError) {
              console.error('Error saving assistant message:', assistantMessageError)
            }

            // Generate and set AI title if needed
            let shouldSetTitle = false
            if (createdChat) {
              shouldSetTitle = true
            } else {
              const { data: existingChat } = await supabase
                .from('chats')
                .select('title')
                .eq('id', chatId!)
                .single()
              const currentTitle = existingChat?.title?.trim() || ''
              if (!currentTitle || currentTitle.toLowerCase() === 'new chat') {
                shouldSetTitle = true
              }
            }

            if (shouldSetTitle) {
              const modelName = process.env.OPENAI_MODEL_NAME || ''
              const titlePrompt = `Create a very short, descriptive chat title (max 6 words, no quotes) based on this conversation.\n\nUser: ${messageContent}\nAssistant: ${fullText.slice(0, 300)}`
              let newTitle = ''
              try {
                if (modelName.toLowerCase().startsWith('gpt-5')) {
                  const tResp: any = await openai.responses.create({
                    model: modelName,
                    input: titlePrompt,
                  })
                  newTitle =
                    tResp?.output_text ||
                    tResp?.choices?.[0]?.message?.content ||
                    tResp?.output?.[0]?.content?.[0]?.text ||
                    tResp?.data?.[0]?.content?.[0]?.text?.value ||
                    ''
                } else {
                  const tComp = await openai.chat.completions.create({
                    model: modelName,
                    messages: [
                      { role: 'system', content: 'Return only a concise, descriptive chat title. Max 6 words. No quotes.' },
                      { role: 'user', content: titlePrompt },
                    ] as any,
                    temperature: 0.3,
                  })
                  newTitle = tComp.choices?.[0]?.message?.content || ''
                }
              } catch (e) {
                // Fallback to truncated user message if model title generation fails
                newTitle = messageContent.slice(0, 50)
              }
              newTitle = (newTitle || 'New Chat').replace(/^"|"$/g, '').trim()
              if (newTitle.length > 60) newTitle = newTitle.slice(0, 60)
              await supabase.from('chats').update({ title: newTitle }).eq('id', chatId!)
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Transfer-Encoding': 'chunked',
      Connection: 'keep-alive',
    }
    if (chatId) headers['X-Chat-Id'] = chatId
    if (createdChat?.title) headers['X-Chat-Title'] = createdChat.title
    if (createdChat) headers['X-Chat-Created'] = '1'

    return new Response(body, { headers })
  } catch (error) {
    console.error('Error in POST /api/chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 