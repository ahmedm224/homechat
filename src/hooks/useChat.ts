import { useState, useCallback, useRef } from 'react'
import { chatApi, type Message, type Conversation } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useChat(conversationId: string | null) {
  const { token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

      try {
        for await (const chunk of chatApi.sendMessage(
          token,
          conversationId,
          content,
          model,
          options
        )) {
          if (chunk.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + chunk.content }
                  : m
              )
            )
          }
          if (chunk.done && chunk.messageId) {
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
