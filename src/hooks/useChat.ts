import { useState, useCallback, useRef } from 'react'
import { chatApi, type Message, type Conversation } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Typing speed control - characters per batch and delay between batches
const CHARS_PER_BATCH = 3
const BATCH_DELAY_MS = 30

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useChat(conversationId: string | null) {
  const { token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingTextRef = useRef('')
  const isTypingRef = useRef(false)

  const loadConversation = useCallback(async (id: string) => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await chatApi.getConversation(token, id)
      setMessages(data.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const sendMessage = useCallback(
    async (
      content: string,
      model: 'fast' | 'thinking',
      options?: { attachments?: string[]; webSearch?: boolean }
    ) => {
      if (!token || !conversationId) return

      setError(null)
      setIsStreaming(true)
      pendingTextRef.current = ''
      isTypingRef.current = false

      // Add user message immediately
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: 'user',
        content,
        model: null,
        attachments: options?.attachments ? JSON.stringify(options.attachments) : null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Add placeholder for assistant message
      const assistantMessageId = crypto.randomUUID()
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        model,
        attachments: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Typing effect function
      const typeText = async () => {
        if (isTypingRef.current) return
        isTypingRef.current = true

        while (pendingTextRef.current.length > 0) {
          const batch = pendingTextRef.current.slice(0, CHARS_PER_BATCH)
          pendingTextRef.current = pendingTextRef.current.slice(CHARS_PER_BATCH)

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: m.content + batch }
                : m
            )
          )
          await sleep(BATCH_DELAY_MS)
        }
        isTypingRef.current = false
      }

      try {
        for await (const chunk of chatApi.sendMessage(
          token,
          conversationId,
          content,
          model,
          options
        )) {
          if (chunk.content) {
            pendingTextRef.current += chunk.content
            typeText()
          }
          if (chunk.done && chunk.messageId) {
            // Wait for typing to finish
            while (pendingTextRef.current.length > 0 || isTypingRef.current) {
              await sleep(50)
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, id: chunk.messageId! } : m
              )
            )
          }
          if (chunk.error) {
            throw new Error(chunk.error)
          }
        }

        // Ensure all text is typed out
        while (pendingTextRef.current.length > 0 || isTypingRef.current) {
          await sleep(50)
        }
      } catch (err) {
        // Remove the failed assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
        setError(err instanceof Error ? err.message : 'Failed to send message')
      } finally {
        setIsStreaming(false)
      }
    },
    [token, conversationId]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    loadConversation,
    sendMessage,
    clearMessages,
    setMessages,
  }
}
