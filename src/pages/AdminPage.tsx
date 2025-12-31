import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { adminApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Users, MessageSquare, Trash2, Shield, Baby, Plus, Key } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

interface User {
  id: string
  username: string
  role: string
  created_at: string
}

interface Stats {
  users: number
  conversations: number
  messages: number
  roleDistribution: Array<{ role: string; count: number }>
}

export default function AdminPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)

  // Create user dialog
  const [createDialog, setCreateDialog] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'adult' | 'kid'>('adult')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState<User | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }

    const loadData = async () => {
      if (!token) return
      try {
        const [usersData, statsData, settingsData] = await Promise.all([
          adminApi.getUsers(token),
          adminApi.getStats(token),
          adminApi.getSettings(token),
        ])
        setUsers(usersData)
        setStats(statsData)
        setAllowRegistration(settingsData.allow_registration)
      } catch (error) {
        console.error('Failed to load admin data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user, token, navigate])

  const handleRoleChange = async (userId: string, role: 'adult' | 'kid') => {
    if (!token) return
    try {
      await adminApi.updateRole(token, userId, role)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const handleDelete = async () => {
    if (!token || !deleteDialog) return
    setIsDeleting(true)
    try {
      await adminApi.deleteUser(token, deleteDialog.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.id))
      setDeleteDialog(null)
    } catch (error) {
      console.error('Failed to delete user:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateUser = async () => {
    if (!token) return
    setIsCreating(true)
    setCreateError('')
    try {
      const result = await adminApi.createUser(token, newUsername, newPassword, newRole)
      setUsers((prev) => [
        { id: result.user.id, username: result.user.username, role: result.user.role, created_at: new Date().toISOString() },
        ...prev,
      ])
      setCreateDialog(false)
      setNewUsername('')
      setNewPassword('')
      setNewRole('adult')
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create user')
    } finally {
      setIsCreating(false)
    }
  }

  const handleResetPassword = async () => {
    if (!token || !resetDialog) return
    setIsResetting(true)
    try {
      await adminApi.resetPassword(token, resetDialog.id, resetPassword)
      setResetDialog(null)
      setResetPassword('')
    } catch (error) {
      console.error('Failed to reset password:', error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleToggleRegistration = async (checked: boolean) => {
    if (!token) return
    setAllowRegistration(checked)
    try {
      await adminApi.updateSettings(token, { allow_registration: checked })
    } catch (error) {
      console.error('Failed to update settings:', error)
      setAllowRegistration(!checked) // Revert on error
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage users and view statistics</p>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {stats.users}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    {stats.conversations}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.messages}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Configure system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allow-registration" className="font-medium">
                    Allow Public Registration
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, only admins can create new users
                  </p>
                </div>
                <Switch
                  id="allow-registration"
                  checked={allowRegistration}
                  onCheckedChange={handleToggleRegistration}
                />
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Manage user roles and access</CardDescription>
              </div>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          u.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : u.role === 'kid'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-muted'
                        )}
                      >
                        {u.role === 'admin' ? (
                          <Shield className="h-5 w-5" />
                        ) : u.role === 'kid' ? (
                          <Baby className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-medium">
                            {u.username.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{u.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Joined {formatDate(u.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role !== 'admin' ? (
                        <>
                          <Select
                            value={u.role}
                            onValueChange={(value) =>
                              handleRoleChange(u.id, value as 'adult' | 'kid')
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adult">Adult</SelectItem>
                              <SelectItem value="kid">Kid</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setResetDialog(u)}
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog(u)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground px-2">Admin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDialog?.username}</strong>? This will
              also delete all their conversations and messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialog} onOpenChange={(open) => {
        setCreateDialog(open)
        if (!open) {
          setNewUsername('')
          setNewPassword('')
          setNewRole('adult')
          setCreateError('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with a username and password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'adult' | 'kid')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adult">Adult</SelectItem>
                  <SelectItem value="kid">Kid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isCreating || !newUsername || !newPassword}
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetDialog} onOpenChange={(open) => {
        if (!open) {
          setResetDialog(null)
          setResetPassword('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetDialog?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || !resetPassword || resetPassword.length < 6}
            >
              {isResetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
