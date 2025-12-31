import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelector } from './ModelSelector'
import { Send, Paperclip, Globe, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ModelType = 'fast' | 'thinking'

interface ChatInputProps {
  onSend: (
    content: string,
    model: ModelType,
    options?: { attachments?: string[]; webSearch?: boolean }
  ) => void
  disabled?: boolean
  onFileUpload?: (file: File) => Promise<{ key: string; name: string } | null>
}

export function ChatInput({ onSend, disabled, onFileUpload }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [model, setModel] = useState<ModelType>('fast')
  const [webSearch, setWebSearch] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ key: string; name: string }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [content])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || disabled) return

    onSend(content.trim(), model, {
      attachments: attachments.length > 0 ? attachments.map((a) => a.key) : undefined,
      webSearch: webSearch || undefined,
    })
    setContent('')
    setAttachments([])
    setWebSearch(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onFileUpload) return

    setIsUploading(true)
    try {
      const result = await onFileUpload(file)
      if (result) {
        setAttachments((prev) => [...prev, result])
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((a) => a.key !== key))
  }

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-3">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.key}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.key)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input area */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={disabled}
              className="min-h-[44px] max-h-[200px] resize-none pr-24"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.json,.csv"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                <Paperclip className={cn('h-4 w-4', isUploading && 'animate-pulse')} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', webSearch && 'text-primary')}
                onClick={() => setWebSearch(!webSearch)}
                disabled={disabled}
              >
                <Globe className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button type="submit" size="icon" disabled={disabled || !content.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Model selector and web search indicator */}
        <div className="flex items-center justify-between">
          <ModelSelector model={model} onChange={setModel} disabled={disabled} />
          {webSearch && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Web search enabled
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
