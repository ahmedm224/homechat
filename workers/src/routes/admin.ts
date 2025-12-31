import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
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

export default admin
