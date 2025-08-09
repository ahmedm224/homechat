'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ChatInterface from '@/components/ChatInterface'
import AuthModal from '@/components/AuthModal'
import Header from '@/components/Header'
import dynamic from 'next/dynamic'
import { Chat } from '@/types'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const { user, loading } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPeople, setShowPeople] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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
        // Keep currentChat if it exists in list; otherwise select the first
        if (data.length > 0) {
          const stillThere = currentChat ? data.find((c: Chat) => c.id === currentChat.id) : null
          setCurrentChat(stillThere || data[0])
        } else {
          setCurrentChat(null)
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  // Poll unread user-to-user messages for current user when signed in
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    const poll = async () => {
      try {
        if (!user) { setUnreadCount(0); return }
        const res = await fetch('/api/users/unread-count')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data?.count || 0)
        }
      } catch {}
    }
    poll()
    timer = setInterval(poll, 15_000)
    return () => { if (timer) clearInterval(timer) }
  }, [user])

  const createNewChat = async () => {
    // Anonymous users: start a fresh temporary thread
    if (!user) {
      setCurrentChat(null)
      setChats([])
      return
    }

    setIsLoading(true)
    try {
      // Create new chat immediately
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert([{ user_id: user.id, title: 'New Chat' }])
        .select('*')
        .single()
      if (error || !newChat) throw error
      // Put newly created chat at top and select it
      setChats(prev => [newChat, ...prev])
      setCurrentChat(newChat)
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
        onOpenSidebar={() => setMobileSidebarOpen(true)}
        unreadCount={unreadCount}
      />
      
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar with chat history */}
        <div className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 md:pt-16">
          <div className="flex-1 flex flex-col min-h-0 bg-card border-r border-border">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h2 className="text-lg font-semibold text-foreground">Chats</h2>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {chats.map((chat) => (
                  <div key={chat.id} className="group flex items-center justify-between">
                    <button
                      onClick={() => handleChatSelect(chat)}
                      className={`flex-1 text-left px-2 py-2 text-sm font-medium rounded-md ${
                        currentChat?.id === chat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="truncate">{chat.title}</span>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm('Delete this chat?')) {
                          await supabase.from('chats').delete().eq('id', chat.id)
                          loadChats()
                          if (currentChat?.id === chat.id) {
                            setCurrentChat(null)
                          }
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 max-w-full flex">
              <div className="w-72 bg-card border-r border-border p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold">Chats</h2>
                  <button className="text-sm underline" onClick={() => setMobileSidebarOpen(false)}>Close</button>
                </div>
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div key={chat.id} className="group flex items-center justify-between">
                      <button
                        onClick={() => { setCurrentChat(chat); setMobileSidebarOpen(false) }}
                        className={`flex-1 text-left px-3 py-2 rounded-md ${currentChat?.id === chat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        <span className="truncate block">{chat.title}</span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm('Delete this chat?')) {
                            await supabase.from('chats').delete().eq('id', chat.id)
                            loadChats()
                            if (currentChat?.id === chat.id) {
                              setCurrentChat(null)
                            }
                            setMobileSidebarOpen(false)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="md:pl-80 flex-1">
          <ChatInterface 
            key={currentChat?.id || 'temp'}
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