import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/lib/api'

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const prevMessagesLengthRef = useRef(messages.length)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        shouldAutoScrollRef.current = entry.isIntersecting
      },
      { threshold: 0.1 }
    )

    const element = bottomRef.current
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [])

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current
    prevMessagesLengthRef.current = messages.length

    if (isNewMessage || shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-2xl font-semibold">Welcome to ChatHome</h2>
          <p className="text-muted-foreground">
            Start a conversation by typing a message below. Choose between Fast mode for quick responses
            or Thinking mode for more thoughtful answers.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
