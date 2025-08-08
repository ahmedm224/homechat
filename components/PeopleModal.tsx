'use client'

import { useEffect, useState } from 'react'
import { X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Person {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface PeopleModalProps {
  onClose: () => void
}

export default function PeopleModal({ onClose }: PeopleModalProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [selected, setSelected] = useState<Person | null>(null)
  const [message, setMessage] = useState('')
  const [context, setContext] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/users/presence')
      if (res.ok) {
        setPeople(await res.json())
      }
    }
    load()
  }, [])

  const sendMessage = async () => {
    if (!selected || !message.trim()) return
    setIsSending(true)
    try {
      const res = await fetch('/api/users/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selected.id, rawMessage: message, context }),
      })
      if (res.ok) {
        setMessage('')
        setContext('')
        onClose()
      }
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold">People</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="space-y-2 max-h-80 overflow-auto">
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md border',
                  selected?.id === p.id ? 'border-primary' : 'border-border hover:bg-accent'
                )}
              >
                <div className="text-sm font-medium">{p.full_name || p.email}</div>
                <div className="text-xs text-muted-foreground">{p.email}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs">Context (optional)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs">Message to send</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={5}
                placeholder="Ask the AI to refine and send this to the selected user"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={sendMessage}
                disabled={isSending || !selected || !message.trim()}
                className={cn('bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm inline-flex items-center gap-2')}
              >
                <Send className="h-4 w-4" />
                Send via AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

