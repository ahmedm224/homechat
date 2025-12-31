import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { User, Copy, Check } from 'lucide-react'
import type { Message } from '@/lib/api'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div
      className={cn(
        'group flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className={cn('h-8 w-8 shrink-0', isUser ? 'bg-primary' : '')}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarImage src="/aichatlogo.jpg" alt="AI" className="rounded-lg" />
        )}
      </Avatar>
      <div
        className={cn(
          'flex-1 space-y-1 overflow-hidden',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div className="relative inline-block max-w-[85%]">
          <div
            className={cn(
              'rounded-2xl px-4 py-2 text-left',
              isUser
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted rounded-bl-md'
            )}
          >
            <div className="whitespace-pre-wrap break-words text-sm">
              {message.content}
              {isStreaming && !message.content && (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                </span>
              )}
              {isStreaming && message.content && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
              )}
            </div>
          </div>
          {/* Copy button - shows on hover */}
          {message.content && !isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
                isUser ? '-left-8 top-1' : '-right-8 top-1'
              )}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
