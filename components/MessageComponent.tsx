'use client'

import { Message } from '@/types'
import { User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn, formatDate } from '@/lib/utils'

interface MessageComponentProps {
  message: Message
}

export default function MessageComponent({ message }: MessageComponentProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex space-x-3",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex space-x-3 max-w-[80%]",
        isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <div className={cn(
          "flex flex-col space-y-1",
          isUser ? "items-end" : "items-start"
        )}>
          <div className={cn(
            "rounded-lg px-4 py-2 max-w-full",
            isUser 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-foreground"
          )}>
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