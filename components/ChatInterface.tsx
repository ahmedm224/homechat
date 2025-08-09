'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Send, Paperclip, X, Pencil, ChevronDown, Gauge } from 'lucide-react'
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
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

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

  useEffect(() => {
    autoResizeTextarea()
  }, [input])

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

  const autoResizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const newHeight = Math.min(el.scrollHeight, 200)
    el.style.height = newHeight + 'px'
  }

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollToBottom(distanceFromBottom > 80)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    // Trigger once
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

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
        // Always promote to the chat ID returned by server
        if (newChatId) {
          onChatCreated({ id: newChatId, title: response.headers.get('X-Chat-Title') || 'New Chat' } as any)
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
            chat_id: newChatId || currentChat?.id || '',
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

  const isEmptyThread = messages.length === 0

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages - Full width, no padding constraints */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-3 px-3 sm:px-4 pb-28"
      >
        {!currentChat && isEmptyThread && !user && (
          <div className="text-center text-muted-foreground mt-8">
            <p>Temporary chat (not saved). Sign in to save your conversations.</p>
          </div>
        )}
        {!isEmptyThread && (
          <>
            {messages.map((message) => (
              <MessageComponent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll-to-bottom floating button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-4 z-30 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center active:scale-95 transition-transform"
          title="Scroll to latest"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Floating typing indicator just above the input */}
      {isLoading && (
        <div className="fixed bottom-28 left-4 right-4 z-20 flex justify-start">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs text-muted-foreground">
            <span>AI is typing</span>
            <span className="typing-dots" aria-hidden>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
          </div>
        </div>
      )}

      {/* Floating chat bubble input */}
      <div className="fixed bottom-3 left-3 right-3 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <form onSubmit={handleSubmit} className="space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-full">
                    <span className="text-xs md:text-sm max-w-[200px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(index)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Chat bubble container */}
          <div className="relative bg-muted/30 backdrop-blur-sm rounded-3xl border border-muted/50 shadow-lg px-3 sm:px-4 py-2.5">
            {/* Left icon: attachments */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              {user ? (
                <FileUpload onUpload={handleFileUpload}>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center justify-center rounded-full",
                      "bg-muted/50 hover:bg-muted/70 h-8 w-8"
                    )}
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                </FileUpload>
              ) : (
                <button
                  type="button"
                  disabled
                  className={cn("inline-flex items-center justify-center rounded-full bg-muted/30 h-8 w-8")}
                  title="Sign in to attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Right icons: effort toggle, optional canvas, send */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReasoningEffort(prev => (prev === 'minimal' ? 'medium' : 'minimal'))}
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted/70 h-8 w-8",
                  "text-xs"
                )}
                title={`Reasoning: ${reasoningEffort === 'minimal' ? 'Fast' : 'Balanced'}`}
              >
                <Gauge className="h-4 w-4" />
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => setShowCanvas(true)}
                  className="inline-flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted/70 h-8 w-8"
                  title="Open canvas"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={cn(
                  "inline-flex items-center justify-center rounded-full active:scale-95 transition-transform",
                  "bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 shadow-md"
                )}
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isEmptyThread ? "Ask anything..." : "Type your message..."}
              className={cn(
                "flex w-full rounded-2xl border-0 bg-transparent pl-10 pr-36 py-2.5 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0",
                "resize-none min-h-[48px] max-h-[200px] transition-[height] duration-200 ease-out"
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
          </form>
          {showCanvas && user && (
            <DynamicCanvasModal
              onClose={() => setShowCanvas(false)}
              onSave={(file) => setAttachments(prev => [...prev, file])}
            />
          )}
        </div>
    </div>
  )
} 

const DynamicCanvasModal = dynamic(() => import('./CanvasModal'), { ssr: false })