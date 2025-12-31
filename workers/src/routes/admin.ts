import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { hashPassword } from '../lib/password'
import type { Env, User, JWTPayload } from '../types'

type Variables = {
  user: JWTPayload
  userRecord: User
}

const admin = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth and admin middleware to all routes
admin.use('*', authMiddleware, adminMiddleware)

// List all users
admin.get('/users', async (c) => {
  const users = await c.env.DB.prepare(
    'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
  ).all<Omit<User, 'password_hash'>>()

  return c.json(users.results)
})

// Get user by ID
admin.get('/users/:id', async (c) => {
  const id = c.req.param('id')

  const user = await c.env.DB.prepare(
    'SELECT id, username, role, created_at FROM users WHERE id = ?'
  )
    .bind(id)
    .first<Omit<User, 'password_hash'>>()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Get user stats
  const conversationCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?'
  )
    .bind(id)
    .first<{ count: number }>()

  const messageCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.user_id = ?`
  )
    .bind(id)
    .first<{ count: number }>()

  return c.json({
    ...user,
    stats: {
      conversations: conversationCount?.count || 0,
      messages: messageCount?.count || 0,
    },
  })
})

const updateRoleSchema = z.object({
  role: z.enum(['adult', 'kid']),
})

// Update user role
admin.patch('/users/:id/role', zValidator('json', updateRoleSchema), async (c) => {
  const currentUser = c.get('user')
  const id = c.req.param('id')
  const { role } = c.req.valid('json')

  // Prevent admin from changing their own role
  if (id === currentUser.sub) {
    return c.json({ error: 'Cannot change your own role' }, 400)
  }

  // Check if target user exists and is not an admin
  const targetUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>()

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404)
  }

  if (targetUser.role === 'admin') {
    return c.json({ error: 'Cannot change admin role' }, 400)
  }

  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
    .bind(role, id)
    .run()

  return c.json({ message: 'Role updated', role })
})

// Delete user
admin.delete('/users/:id', async (c) => {
  const currentUser = c.get('user')
  const id = c.req.param('id')

  // Prevent admin from deleting themselves
  if (id === currentUser.sub) {
    return c.json({ error: 'Cannot delete your own account' }, 400)
  }

  // Check if target user exists and is not an admin
  const targetUser = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>()

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404)
  }

  if (targetUser.role === 'admin') {
    return c.json({ error: 'Cannot delete admin user' }, 400)
  }

  // Delete user (cascades to conversations and messages)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  // Clean up user files in R2
  const files = await c.env.FILES.list({ prefix: `${id}/` })
  for (const object of files.objects) {
    await c.env.FILES.delete(object.key)
  }

  return c.json({ message: 'User deleted' })
})

// Get system stats
admin.get('/stats', async (c) => {
  const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{
    count: number
  }>()

  const conversationCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM conversations'
  ).first<{ count: number }>()

  const messageCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM messages').first<{
    count: number
  }>()

  const roleDistribution = await c.env.DB.prepare(
    'SELECT role, COUNT(*) as count FROM users GROUP BY role'
  ).all<{ role: string; count: number }>()

  return c.json({
    users: userCount?.count || 0,
    conversations: conversationCount?.count || 0,
    messages: messageCount?.count || 0,
    roleDistribution: roleDistribution.results,
  })
})

// Create user schema
const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
  role: z.enum(['adult', 'kid']).default('adult'),
})

// Create new user (admin only)
admin.post('/users', zValidator('json', createUserSchema), async (c) => {
  const { username, password, role } = c.req.valid('json')

  // Check if username already exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first()

  if (existing) {
    return c.json({ error: 'Username already exists' }, 400)
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)

  await c.env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
  )
    .bind(id, username, passwordHash, role)
    .run()

  return c.json({
    user: { id, username, role },
    message: 'User created successfully',
  })
})

// Reset password schema
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
})

// Reset user password (admin only)
admin.patch('/users/:id/password', zValidator('json', resetPasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { password } = c.req.valid('json')

  // Check if user exists
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const passwordHash = await hashPassword(password)

  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, id)
    .run()

  return c.json({ message: 'Password reset successfully' })
})

// Get settings
admin.get('/settings', async (c) => {
  const settings = await c.env.DB.prepare('SELECT key, value FROM settings').all<{
    key: string
    value: string
  }>()

  const result: Record<string, string | boolean> = {}
  for (const setting of settings.results) {
    // Convert string 'true'/'false' to boolean
    if (setting.value === 'true' || setting.value === 'false') {
      result[setting.key] = setting.value === 'true'
    } else {
      result[setting.key] = setting.value
    }
  }

  return c.json(result)
})

// Update settings schema
const updateSettingsSchema = z.object({
  allow_registration: z.boolean().optional(),
})

// Update settings
admin.patch('/settings', zValidator('json', updateSettingsSchema), async (c) => {
  const updates = c.req.valid('json')

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      await c.env.DB.prepare(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
      )
        .bind(key, String(value), String(value))
        .run()
    }
  }

  return c.json({ message: 'Settings updated' })
})

export default admin
