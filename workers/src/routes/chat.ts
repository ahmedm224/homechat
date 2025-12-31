import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { streamChatCompletion, getSystemPrompt } from '../lib/openai'
import { webSearch, formatSearchResults } from '../lib/search'
import { authMiddleware } from '../middleware/auth'
import type { Env, User, JWTPayload, Conversation, Message } from '../types'

type Variables = {
  user: JWTPayload
  userRecord: User
}

const chat = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth middleware to all routes
chat.use('*', authMiddleware)

// List conversations
chat.get('/conversations', async (c) => {
  const user = c.get('user')

  const conversations = await c.env.DB.prepare(
    `SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM conversations c
     WHERE c.user_id = ?
     ORDER BY c.updated_at DESC`
  )
    .bind(user.sub)
    .all<Conversation & { last_message: string | null }>()

  return c.json(conversations.results)
})

// Create new conversation
chat.post('/conversations', async (c) => {
  const user = c.get('user')
  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO conversations (id, user_id) VALUES (?, ?)'
  )
    .bind(id, user.sub)
    .run()

  return c.json({ id, user_id: user.sub, title: null, created_at: new Date().toISOString() })
})

// Get conversation with messages
chat.get('/conversations/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const conversation = await c.env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
  )
    .bind(id, user.sub)
    .first<Conversation>()

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  const messages = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  )
    .bind(id)
    .all<Message>()

  return c.json({
    ...conversation,
    messages: messages.results,
  })
})

// Delete conversation
chat.delete('/conversations/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const result = await c.env.DB.prepare(
    'DELETE FROM conversations WHERE id = ? AND user_id = ?'
  )
    .bind(id, user.sub)
    .run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  return c.json({ message: 'Conversation deleted' })
})

// Update conversation title
chat.patch('/conversations/:id', zValidator('json', z.object({ title: z.string() })), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const { title } = c.req.valid('json')

  const result = await c.env.DB.prepare(
    'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  )
    .bind(title, id, user.sub)
    .run()

  if (result.meta.changes === 0) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  return c.json({ message: 'Title updated' })
})

const messageSchema = z.object({
  content: z.string().min(1).max(10000),
  model: z.enum(['fast', 'thinking']),
  attachments: z.array(z.string()).optional(),
  webSearch: z.boolean().optional(),
})

// Send message and get streaming response
chat.post('/conversations/:id/messages', zValidator('json', messageSchema), async (c) => {
  const user = c.get('user')
  const userRecord = c.get('userRecord')
  const conversationId = c.req.param('id')
  const { content, model, attachments, webSearch: doWebSearch } = c.req.valid('json')

  // Verify conversation exists and belongs to user
  const conversation = await c.env.DB.prepare(
    'SELECT * FROM conversations WHERE id = ? AND user_id = ?'
  )
    .bind(conversationId, user.sub)
    .first<Conversation>()

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  // Get conversation history
  const history = await c.env.DB.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 50'
  )
    .bind(conversationId)
    .all<{ role: 'user' | 'assistant'; content: string }>()

  // Save user message
  const userMessageId = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO messages (id, conversation_id, role, content, attachments) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(
      userMessageId,
      conversationId,
      'user',
      content,
      attachments ? JSON.stringify(attachments) : null
    )
    .run()

  // Web search if requested
  let webSearchContext: string | undefined
  if (doWebSearch) {
    try {
      const results = await webSearch(content, c.env.SCRAPINGDOG_API_KEY)
      webSearchContext = formatSearchResults(results)
    } catch (error) {
      console.error('Web search error:', error)
    }
  }

  // Process attachments
  let attachmentContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = []
  if (attachments && attachments.length > 0) {
    for (const key of attachments) {
      try {
        const file = await c.env.FILES.get(key)
        if (!file) continue

        const contentType = file.httpMetadata?.contentType || ''

        if (contentType.startsWith('image/')) {
          // For images, convert to base64 data URL
          const arrayBuffer = await file.arrayBuffer()
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
          const dataUrl = `data:${contentType};base64,${base64}`
          attachmentContent.push({
            type: 'image_url',
            image_url: { url: dataUrl }
          })
        } else {
          // For text files (txt, md, json, csv, pdf), extract text
          const text = await file.text()
          const fileName = key.split('/').pop() || 'file'
          attachmentContent.push({
            type: 'text',
            text: `[Attached file: ${fileName}]\n${text}\n[End of file]`
          })
        }
      } catch (error) {
        console.error('Error processing attachment:', error)
      }
    }
  }

  // Prepare messages for OpenAI
  const messages = history.results.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Build user message content
  let userMessageContent: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>
  if (attachmentContent.length > 0) {
    // Use array format for multimodal content
    userMessageContent = [
      { type: 'text' as const, text: content },
      ...attachmentContent
    ]
  } else {
    userMessageContent = content
  }

  messages.push({ role: 'user' as const, content: userMessageContent })

  // Create streaming response
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Start streaming in background
  const assistantMessageId = crypto.randomUUID()
  let fullResponse = ''

  c.executionCtx.waitUntil(
    (async () => {
      try {
        for await (const chunk of streamChatCompletion({
          messages,
          modelType: model,
          userRole: userRecord.role,
          apiKey: c.env.OPENAI_API_KEY,
          webSearchContext,
        })) {
          fullResponse += chunk
          await writer.write(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
        }

        // Save assistant message
        await c.env.DB.prepare(
          'INSERT INTO messages (id, conversation_id, role, content, model) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(assistantMessageId, conversationId, 'assistant', fullResponse, model)
          .run()

        // Update conversation title if it's the first message
        if (!conversation.title && fullResponse.length > 0) {
          const title = fullResponse.slice(0, 50) + (fullResponse.length > 50 ? '...' : '')
          await c.env.DB.prepare(
            'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
            .bind(title, conversationId)
            .run()
        } else {
          await c.env.DB.prepare(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
            .bind(conversationId)
            .run()
        }

        await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true, messageId: assistantMessageId })}\n\n`))
      } catch (error) {
        console.error('Streaming error:', error)
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`)
        )
      } finally {
        await writer.close()
      }
    })()
  )

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})

// File upload
chat.post('/upload', async (c) => {
  const user = c.get('user')

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'File too large (max 10MB)' }, 400)
  }

  const key = `${user.sub}/${crypto.randomUUID()}-${file.name}`

  await c.env.FILES.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  return c.json({ key, name: file.name, size: file.size, type: file.type })
})

// Get file
chat.get('/files/:key{.+}', async (c) => {
  const user = c.get('user')
  const key = c.req.param('key')

  // Verify file belongs to user
  if (!key.startsWith(`${user.sub}/`)) {
    return c.json({ error: 'Access denied' }, 403)
  }

  const object = await c.env.FILES.get(key)

  if (!object) {
    return c.json({ error: 'File not found' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

export default chat
