import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useConversations } from '@/hooks/useConversations'

export default function ChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const { createConversation } = useConversations()

  return (
    <div className="h-full flex">
      <Sidebar
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversation}
        onNewConversation={createConversation}
      />
      <main className="flex-1 flex flex-col min-h-0 lg:pl-0 pl-0">
        <ChatWindow conversationId={selectedConversation} />
      </main>
    </div>
  )
}
