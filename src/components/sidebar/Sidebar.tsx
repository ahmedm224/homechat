import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ConversationList } from './ConversationList'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useConversations } from '@/hooks/useConversations'
import { cn } from '@/lib/utils'
import { Plus, Menu, X, Sun, Moon, LogOut, Shield } from 'lucide-react'
import type { Conversation } from '@/lib/api'

interface SidebarProps {
  selectedConversation: string | null
  onSelectConversation: (id: string | null) => void
  onNewConversation: () => Promise<Conversation | null>
}

export function Sidebar({
  selectedConversation,
  onSelectConversation,
  onNewConversation,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { conversations, deleteConversation } = useConversations()
  const navigate = useNavigate()

  const handleNewChat = async () => {
    const conversation = await onNewConversation()
    if (conversation) {
      onSelectConversation(conversation.id)
    }
    setIsOpen(false)
  }

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id)
    setIsOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteConversation(id)
    if (selectedConversation === id) {
      onSelectConversation(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header with Logo and Theme Toggle */}
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ChatHome" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-semibold">Family</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9" 
            onClick={toggleTheme}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 lg:hidden" 
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button onClick={handleNewChat} className="w-full" size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversation}
        onSelect={handleSelectConversation}
        onDelete={handleDelete}
      />

      {/* User Menu */}
      <div className="mt-auto border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {user?.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{user?.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === 'admin' && (
              <>
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b flex items-center justify-between px-4 z-40 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ChatHome" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold">Family</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-background border-r transform transition-transform duration-200 lg:relative lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
