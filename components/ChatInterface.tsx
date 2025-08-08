'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Send, Paperclip, X, Pencil } from 'lucide-react'
import { Chat, Message } from '@/types'
import MessageComponent from './MessageComponent'
import FileUpload from './FileUpload'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  currentChat: Chat | null
  onChatUpdate: () => void
  onChatCreated: (chat: Chat) => void
  user: User | null
}

export default function ChatInterface({ currentChat, onChatUpdate, onChatCreated, user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [reasoningEffort, setReasoningEffort] = useState<'minimal' | 'medium'>('minimal')
  const [showCanvas, setShowCanvas] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentChat) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [currentChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!currentChat) return

    try {
      const response = await fetch(`/api/chats/${currentChat.id}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && attachments.length === 0) return

    const userMessage = {
      role: 'user' as const,
      content: input,
      attachments: attachments
    }

    // Add user message to UI immediately
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      chat_id: currentChat?.id || '',
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempUserMessage])
    setInput('')
    setAttachments([])
    setIsLoading(true)

    try {
      const formData = new FormData()
      if (currentChat?.id) formData.append('chatId', currentChat.id)
      formData.append('message', input)
      // send last 10 messages as lightweight history for anonymous users
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      formData.append('history', JSON.stringify(history))
      if (user && attachments.length > 0) {
        attachments.forEach((file) => {
          formData.append('files', file)
        })
      }
      formData.append('reasoningEffort', reasoningEffort)

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      })

      if (response.ok && response.headers.get('Content-Type')?.startsWith('text/plain')) {
        // Streaming path
        // If server created a chat on demand, capture it via headers
        const newChatId = response.headers.get('X-Chat-Id')
        const created = response.headers.get('X-Chat-Created') === '1'
        if (!currentChat && newChatId && created) {
          onChatUpdate()
        }

        const reader = (response.body as ReadableStream).getReader()
        const decoder = new TextDecoder()
        let assistantText = ''
        // Insert a temp assistant message to update progressively
        const tempAssistantId = `temp-assistant-${Date.now()}`
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserMessage.id),
          {
            id: tempAssistantId,
            chat_id: currentChat?.id || newChatId || '',
            role: 'assistant',
            content: '',
            created_at: new Date().toISOString(),
          } as Message,
        ])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          assistantText += chunk
          setMessages(prev => prev.map(m => m.id === tempAssistantId ? { ...m, content: assistantText } : m))
        }

        onChatUpdate()
      } else if (response.ok) {
        // Non-stream JSON fallback
        const data = await response.json()
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== tempUserMessage.id)
          return [...filtered, data.userMessage, data.assistantMessage]
        })
        if (!currentChat && data.chat) {
          onChatCreated(data.chat)
        }
        onChatUpdate()
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
        try {
          const err = await response.json()
          console.error('Error sending message', err)
        } catch {
          console.error('Error sending message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (files: File[]) => {
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Always render the chat UI; when no currentChat, it's a temporary (unsaved) chat

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentChat && messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-8">
            <p>Temporary chat (not saved). Sign in to save your conversations.</p>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))
        )}
        {isLoading && (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-md"
                >
                  <span className="text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className={cn(
                  "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  "resize-none"
                )}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Reasoning effort selector (gpt-5 only) */}
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as 'minimal' | 'medium')}
                title="Reasoning effort"
                className={cn(
                  "h-10 rounded-md border border-input bg-background px-2 text-sm",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                )}
              >
                <option value="minimal">Fast</option>
                <option value="medium">Balanced</option>
              </select>

              {user ? (
                <FileUpload onUpload={handleFileUpload}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 w-10"
                    )}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </FileUpload>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Sign in to attach files"
                  className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    "border border-input bg-background shadow-sm h-10 w-10"
                  )}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              )}
              
              {user && (
                <button
                  type="button"
                  onClick={() => setShowCanvas(true)}
                  title="Open canvas"
                  className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-10 w-10"
                  )}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                  "bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 w-10"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
        {showCanvas && user && (
          <DynamicCanvasModal
            onClose={() => setShowCanvas(false)}
            onSave={(file) => {
              setAttachments(prev => [...prev, file])
            }}
          />
        )}
      </div>
    </div>
  )
} 

const DynamicCanvasModal = dynamic(() => import('./CanvasModal'), { ssr: false })