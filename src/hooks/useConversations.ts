import { useState, useCallback, useEffect } from 'react'
import { chatApi, type Conversation } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useConversations() {
  const { token } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await chatApi.getConversations(token)
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversation')
      return null
    }
  }, [token])

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!token) return

      try {
        await chatApi.deleteConversation(token, id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete conversation')
      }
    },
    [token]
  )

  const updateTitle = useCallback(
    async (id: string, title: string) => {
      if (!token) return

      try {
        await chatApi.updateTitle(token, id, title)
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update title')
      }
    },
    [token]
  )

  // Load conversations on mount
  useEffect(() => {
    if (token) {
      loadConversations()
    }
  }, [token, loadConversations])

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    createConversation,
    deleteConversation,
    updateTitle,
  }
}
