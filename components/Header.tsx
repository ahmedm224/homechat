'use client'

import { User } from '@supabase/supabase-js'
import { Plus, LogIn, LogOut, User as UserIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  user: User | null
  onNewChat: () => void
  onSignIn: () => void
  onSignOut: () => void
  onOpenPeople?: () => void
}

export default function Header({ user, onNewChat, onSignIn, onSignOut, onOpenPeople }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">HomeChat</span>
          </a>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center space-x-2">
            <button
              onClick={onNewChat}
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                "bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                {onOpenPeople && (
                  <button
                    onClick={onOpenPeople}
                    className={cn(
                      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2"
                    )}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    People
                  </button>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden md:inline-block">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={onSignOut}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  )}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                  "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                )}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 