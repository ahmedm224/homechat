'use client'

import { Message } from '@/types'
import { User, Bot, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn, formatDate } from '@/lib/utils'

interface MessageComponentProps {
  message: Message
}

export default function MessageComponent({ message }: MessageComponentProps) {
  const isUser = message.role === 'user'
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {}
  }

  return (
    <div
      className={cn(
        'flex space-x-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex space-x-3 max-w-[88vw] sm:max-w-[70%] animate-fade-in',
          isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            isUser ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-muted text-muted-foreground'
          )}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <div
          className={cn('flex flex-col space-y-1.5', isUser ? 'items-end' : 'items-start')}
        >
          <div
            className={cn(
              'rounded-2xl px-4 py-2 max-w-full relative shadow-sm',
              isUser
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-card text-foreground border border-border'
            )}
          >
            {!isUser && (
              <button
                onClick={handleCopy}
                title="Copy"
                className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                className="markdown"
                components={{
                  // Override code block styling
                  pre: ({ children }) => (
                    <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto">
                      {children}
                    </pre>
                  ),
                  // Override inline code styling
                  code: ({ children, className }) => {
                    const isInline = !className
                    return isInline ? (
                      <code className="bg-muted/50 px-1 py-0.5 rounded text-sm">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-2 bg-muted/50 px-3 py-1 rounded-md"
                >
                  <span className="text-sm">{attachment.file_name}</span>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-muted-foreground">
            {formatDate(message.created_at)}
          </div>
        </div>
      </div>
    </div>
  )
} 