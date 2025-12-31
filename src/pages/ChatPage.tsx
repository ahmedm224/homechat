import { useState, useEffect, useRef, useCallback } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useConversations } from '@/hooks/useConversations'

const SELECTED_CONVERSATION_KEY = 'chathome_selected_conversation'

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(() => {
    // Restore from localStorage on initial load
    return localStorage.getItem(SELECTED_CONVERSATION_KEY)
  })
  const { conversations, createConversation } = useConversations()
  const hasAutoCreated = useRef(false)
  const hasRestoredConversation = useRef(false)

  // Handle conversation selection with persistence
  const handleSelectConversation = useCallback((id: string | null) => {
    setSelectedConversation(id)
    if (id) {
      localStorage.setItem(SELECTED_CONVERSATION_KEY, id)
    } else {
      localStorage.removeItem(SELECTED_CONVERSATION_KEY)
    }
  }, [])

  // Auto-create new chat on login if no conversations exist
  useEffect(() => {
    // First, try to restore saved conversation
    if (!hasRestoredConversation.current && selectedConversation && conversations.length > 0) {
      hasRestoredConversation.current = true
      // Check if saved conversation still exists
      const exists = conversations.some(c => c.id === selectedConversation)
      if (!exists) {
        // Saved conversation no longer exists, select most recent
        handleSelectConversation(conversations[0].id)
      }
      return
    }

    if (!hasAutoCreated.current && conversations.length === 0) {
      hasAutoCreated.current = true
      createConversation().then((conv) => {
        if (conv) {
          handleSelectConversation(conv.id)
        }
      })
    } else if (!selectedConversation && conversations.length > 0) {
      // Select the most recent conversation if none selected
      handleSelectConversation(conversations[0].id)
    }
  }, [conversations, selectedConversation, createConversation, handleSelectConversation])

  return (
    <div className="h-full flex">
      <Sidebar
        selectedConversation={selectedConversation}
        onSelectConversation={handleSelectConversation}
        onNewConversation={createConversation}
      />
      <main className="flex-1 flex flex-col min-h-0 pt-14 lg:pt-0">
        <ChatWindow
          conversationId={selectedConversation}
          onConversationCreated={handleSelectConversation}
          createConversation={createConversation}
        />
      </main>
    </div>
  )
}
