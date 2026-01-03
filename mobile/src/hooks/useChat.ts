import { useState, useCallback, useRef } from 'react'
import { chatApi, Message, Conversation } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export function useChat(conversationId: string | null) {
  const { token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadConversation = useCallback(
    async (id: string) => {
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
    },
    [token]
  )

  const sendMessage = useCallback(
    async (
      content: string,
      model: 'fast' | 'thinking',
      options?: { attachments?: string[]; webSearch?: boolean }
    ) => {
      if (!token || !conversationId) return

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

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
          { ...options, signal: abortControllerRef.current.signal }
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
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
        setError(err instanceof Error ? err.message : 'Failed to send message')
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [token, conversationId]
  )

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

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
    stopStreaming,
    clearMessages,
  }
}

export function useConversations() {
  const { token } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadConversations = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    try {
      const data = await chatApi.getConversations(token)
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const createConversation = useCallback(async () => {
    if (!token) return null

    try {
      const conversation = await chatApi.createConversation(token)
      setConversations((prev) => [conversation, ...prev])
      return conversation
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return null
    }
  }, [token])

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!token) return

      try {
        await chatApi.deleteConversation(token, id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
    },
    [token]
  )

  return {
    conversations,
    isLoading,
    loadConversations,
    createConversation,
    deleteConversation,
  }
}
