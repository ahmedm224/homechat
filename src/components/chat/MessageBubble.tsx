import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import type { Message } from '@/lib/api'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className={cn('h-8 w-8 shrink-0', isUser ? 'bg-primary' : '')}>
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <AvatarImage src="/logo.png" alt="AI" className="rounded-lg" />
        )}
      </Avatar>
      <div
        className={cn(
          'flex-1 space-y-1 overflow-hidden',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left',
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
      </div>
    </div>
  )
}
