import { useState, useEffect, useRef } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useConversations } from '@/hooks/useConversations'

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const { conversations, createConversation } = useConversations()
  const hasAutoCreated = useRef(false)

  // Auto-create new chat on login if no conversations exist
  useEffect(() => {
    if (!hasAutoCreated.current && conversations.length === 0) {
      hasAutoCreated.current = true
      createConversation().then((conv) => {
        if (conv) {
          setSelectedConversation(conv.id)
        }
      })
    } else if (!selectedConversation && conversations.length > 0) {
      // Select the most recent conversation if none selected
      setSelectedConversation(conversations[0].id)
    }
  }, [conversations, selectedConversation, createConversation])

  return (
    <div className="h-full flex">
      <Sidebar
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewConversation={createConversation}
      />
      <main className="flex-1 flex flex-col min-h-0 lg:pl-0 pl-0">
        <ChatWindow
          conversationId={selectedConversation}
          onConversationCreated={setSelectedConversation}
          createConversation={createConversation}
        />
      </main>
    </div>
  )
}
