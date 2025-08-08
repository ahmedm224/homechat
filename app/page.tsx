'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ChatInterface from '@/components/ChatInterface'
import AuthModal from '@/components/AuthModal'
import Header from '@/components/Header'
import dynamic from 'next/dynamic'
import { Chat, Message } from '@/types'

export default function Home() {
  const { user, loading } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPeople, setShowPeople] = useState(false)

  useEffect(() => {
    if (user) {
      loadChats()
    }
  }, [user])

  const loadChats = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/chats')
      if (response.ok) {
        const data = await response.json()
        setChats(data)
        if (data.length > 0 && !currentChat) {
          setCurrentChat(data[0])
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  const createNewChat = async () => {
    // Allow anonymous users to start a temporary chat (not saved)
    if (!user) {
      setCurrentChat(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' }),
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats(prev => [newChat, ...prev])
        setCurrentChat(newChat)
      }
    } catch (error) {
      console.error('Error creating chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        user={user} 
        onNewChat={createNewChat}
        onSignIn={() => setShowAuthModal(true)}
        onSignOut={() => setCurrentChat(null)}
        onOpenPeople={() => setShowPeople(true)}
      />
      
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 md:pt-16">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h2 className="text-lg font-semibold text-foreground">Chats</h2>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left ${
                      currentChat?.id === chat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="md:pl-80 flex-1">
          <ChatInterface 
            currentChat={currentChat}
            onChatUpdate={loadChats}
            onChatCreated={(chat) => {
              setCurrentChat(chat)
              // Refresh chat list to include the newly created chat
              loadChats()
            }}
            user={user}
          />
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false)
            loadChats()
          }}
        />
      )}

      {showPeople && (
        <DynamicPeopleModal onClose={() => setShowPeople(false)} />
      )}
    </div>
  )
} 

const DynamicPeopleModal = dynamic(() => import('@/components/PeopleModal'), { ssr: false })