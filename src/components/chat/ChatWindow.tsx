import { useEffect, useState, useCallback } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/contexts/AuthContext'
import { chatApi, type Conversation } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'

interface ChatWindowProps {
  conversationId: string | null
  onConversationCreated?: (id: string) => void
  createConversation?: () => Promise<Conversation | null>
}

export function ChatWindow({ conversationId, onConversationCreated, createConversation }: ChatWindowProps) {
  const { token } = useAuth()
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const { messages, isLoading, isStreaming, error, loadConversation, sendMessage, stopStreaming, clearMessages } =
    useChat(conversationId)

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    } else {
      clearMessages()
    }
  }, [conversationId, loadConversation, clearMessages])

  const handleFileUpload = async (file: File) => {
    if (!token) return null
    try {
      return await chatApi.uploadFile(token, file)
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSend = useCallback(async (
    content: string,
    model: 'fast' | 'thinking',
    options?: { attachments?: string[]; webSearch?: boolean }
  ) => {
    // If no conversation exists, create one first
    if (!conversationId && createConversation) {
      setIsCreatingConversation(true)
      try {
        const newConversation = await createConversation()
        if (newConversation) {
          onConversationCreated?.(newConversation.id)
          // Wait a tick for the conversation ID to propagate
          setTimeout(() => {
            sendMessage(content, model, options)
          }, 100)
        }
      } finally {
        setIsCreatingConversation(false)
      }
      return
    }

    sendMessage(content, model, options)
  }, [conversationId, createConversation, onConversationCreated, sendMessage])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} isStreaming={isStreaming} />
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 text-center">
          {error}
        </div>
      )}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || isCreatingConversation}
        isStreaming={isStreaming}
        onStop={stopStreaming}
        onFileUpload={handleFileUpload}
      />
    </div>
  )
}
