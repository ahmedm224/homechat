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
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter((f): f is File => f instanceof File)
    } else {
      const { chatId: cid, message, history: historyJson } = await request.json()
      chatId = cid
      messageContent = message?.content || ''
      history = Array.isArray(historyJson) ? historyJson : []
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

    const userContent: any = attachmentUrls.length > 0
      ? [
          { type: 'text', text: messageContent },
          ...attachmentUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
        ]
      : messageContent

    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant. Be concise and helpful in your responses.' },
      ...chatHistory,
      { role: 'user', content: userContent as any },
    ]

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_NAME || 'gpt-4',
        messages: messages as any,
        max_tokens: 1000,
        temperature: 0.7,
      })
    } catch (err: any) {
      // Fallback for models that don't support image content arrays
      const textOnlyMessages = [
        { role: 'system', content: 'You are a helpful AI assistant. Be concise and helpful in your responses.' },
        ...chatHistory,
        {
          role: 'user',
          content:
            attachmentUrls.length > 0
              ? `${messageContent}\n\nAttached files (URLs):\n${attachmentUrls.join('\n')}`
              : messageContent,
        },
      ]
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_NAME || 'gpt-4',
        messages: textOnlyMessages as any,
        max_tokens: 1000,
        temperature: 0.7,
      })
    }

    const assistantResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Persist assistant message if applicable
    let assistantMessage: any = {
      id: `temp-${Date.now()}`,
      chat_id: chatId || '',
      role: 'assistant',
      content: assistantResponse,
      created_at: new Date().toISOString(),
    }
    if (user && chatId) {
      const { data: insertedAssistantMessage, error: assistantMessageError } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, role: 'assistant', content: assistantResponse }])
        .select()
        .single()
      if (assistantMessageError) {
        console.error('Error saving assistant message:', assistantMessageError)
        return NextResponse.json({ error: 'Failed to save assistant message' }, { status: 500 })
      }
      assistantMessage = insertedAssistantMessage
    }

    // Update chat title on first message if we just created the chat
    if (user && chatId && createdChat) {
      const title = messageContent.slice(0, 50) + (messageContent.length > 50 ? '...' : '')
      await supabase.from('chats').update({ title }).eq('id', chatId)
    }

    // For anonymous users, fabricate a userMessage response
    if (!userMessage) {
      userMessage = {
        id: `temp-${Date.now() - 1}`,
        chat_id: chatId || '',
        role: 'user',
        content: messageContent,
        created_at: new Date().toISOString(),
      }
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
      ...(createdChat ? { chat: createdChat } : {}),
    })
  } catch (error) {
    console.error('Error in POST /api/chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 