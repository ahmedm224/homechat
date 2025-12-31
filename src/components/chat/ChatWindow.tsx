import { useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/contexts/AuthContext'
import { chatApi } from '@/lib/api'
import { Spinner } from '@/components/ui/spinner'

interface ChatWindowProps {
  conversationId: string | null
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { token } = useAuth()
  const { messages, isLoading, isStreaming, error, loadConversation, sendMessage, clearMessages } =
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
        onSend={sendMessage}
        disabled={isStreaming || !conversationId}
        onFileUpload={handleFileUpload}
      />
    </div>
  )
}
