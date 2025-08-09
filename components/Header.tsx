'use client'

import { User } from '@supabase/supabase-js'
import { Plus, LogIn, LogOut, User as UserIcon, Users, Sun, Moon, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: User | null
  onNewChat: () => void
  onSignIn: () => void
  onSignOut: () => void
  onOpenPeople?: () => void
  onOpenSidebar?: () => void
  unreadCount?: number
}

export default function Header({ user, onNewChat, onSignIn, onSignOut, onOpenPeople, onOpenSidebar, unreadCount = 0 }: HeaderProps) {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-3 md:container flex h-12 md:h-14 items-center">
        <div className="mr-2 flex items-center">
          <button
            className="md:hidden mr-2 inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8"
            onClick={() => onOpenSidebar?.()}
            title="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <a className="flex items-center space-x-2" href="/">
            <span className="font-bold text-lg md:text-xl">HomeChat</span>
          </a>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={onNewChat}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                "bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 md:h-9 px-3 md:px-4 py-2"
              )}
            >
              <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              New Chat
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 md:h-9 px-2"
              )}
              title="Toggle theme"
            >
              <Sun className="h-3 w-3 md:h-4 md:w-4 dark:hidden" />
              <Moon className="h-3 w-3 md:h-4 md:w-4 hidden dark:block" />
            </button>
            {user ? (
              <div className="hidden md:flex items-center space-x-2">
                {onOpenPeople && (
                  <button
                    onClick={onOpenPeople}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 md:h-9 px-2 md:px-3 py-1.5"
                    )}
                  >
                    <div className="relative inline-flex items-center">
                      <Users className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                      <span>People</span>
                      {unreadCount > 0 && (
                        <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] px-1">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <UserIcon className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline-block max-w-[140px] truncate">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={onSignOut}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 md:h-9 px-3 md:px-4 py-1.5"
                  )}
                >
                  <LogOut className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className={cn(
                  "hidden md:inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                  "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 md:h-9 px-3 md:px-4 py-1.5"
                )}
              >
                <LogIn className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 