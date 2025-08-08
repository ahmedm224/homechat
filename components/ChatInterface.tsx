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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const isEmptyThread = messages.length === 0

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentChat && isEmptyThread && (
          <div className="text-center text-muted-foreground mt-8">
            <p>Temporary chat (not saved). Sign in to save your conversations.</p>
          </div>
        )}
        {!isEmptyThread && (
          <>
            {messages.map((message) => (
              <MessageComponent key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Centered first input */}
      {isEmptyThread ? (
        <div className="flex-1 -mt-20 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className={cn(
                  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "resize-none min-h-[100px]"
                )}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={reasoningEffort}
                  onChange={(e) => setReasoningEffort(e.target.value as 'minimal' | 'medium')}
                  title="Reasoning effort"
                  className={cn(
                    "h-9 rounded-md border border-input bg-background px-2 text-sm",
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
                        "inline-flex items-center justify-center rounded-md text-sm transition-colors",
                        "border border-input bg-background hover:bg-accent h-9 w-9"
                      )}
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </FileUpload>
                ) : null}
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowCanvas(true)}
                    title="Open canvas"
                    className={cn(
                      "inline-flex items-center justify-center rounded-md text-sm transition-colors",
                      "border border-input bg-background hover:bg-accent h-9 w-9"
                    )}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm",
                  "bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
                )}
              >
                Send
              </button>
            </div>
          </form>
          {showCanvas && user && (
            <DynamicCanvasModal
              onClose={() => setShowCanvas(false)}
              onSave={(file) => setAttachments(prev => [...prev, file])}
            />
          )}
        </div>
      ) : (
        // Compact sticky bottom input after first message
        <div className="sticky bottom-0 z-10 border-t border-border p-2 md:p-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <form onSubmit={handleSubmit} className="space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-md">
                    <span className="text-xs md:text-sm max-w-[200px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(index)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1 md:gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "resize-none min-h-[44px]"
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
              <select
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as 'minimal' | 'medium')}
                title="Reasoning effort"
                className={cn(
                  "h-9 rounded-md border border-input bg-background px-2 text-xs md:text-sm",
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
                      "inline-flex items-center justify-center rounded-md text-sm transition-colors",
                      "border border-input bg-background hover:bg-accent h-9 w-9"
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
                    "inline-flex items-center justify-center rounded-md text-sm",
                    "border border-input bg-background h-9 w-9"
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
                    "inline-flex items-center justify-center rounded-md text-sm",
                    "border border-input bg-background hover:bg-accent h-9 w-9"
                  )}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm",
                  "bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 md:w-10"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
          {showCanvas && user && (
            <DynamicCanvasModal
              onClose={() => setShowCanvas(false)}
              onSave={(file) => setAttachments(prev => [...prev, file])}
            />
          )}
        </div>
      )}
    </div>
  )
} 

const DynamicCanvasModal = dynamic(() => import('./CanvasModal'), { ssr: false })