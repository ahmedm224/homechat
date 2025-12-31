import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MessageSquare, Trash2 } from 'lucide-react'
import type { Conversation } from '@/lib/api'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    setConversationToDelete(conversation)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDelete(conversationToDelete.id)
    }
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No conversations yet
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                'group rounded-lg p-2 cursor-pointer transition-colors',
                selectedId === conversation.id
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium break-words">
                    {conversation.title || 'New conversation'}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(conversation.updated_at)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => handleDeleteClick(e, conversation)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{conversationToDelete?.title || 'New conversation'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
