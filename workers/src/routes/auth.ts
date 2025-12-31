import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../lib/password'
import { signJWT } from '../lib/jwt'
import type { Env, User, JWTPayload } from '../types'
import { authMiddleware } from '../middleware/auth'

type Variables = {
  user: JWTPayload
  userRecord: User
}

const auth = new Hono<{ Bindings: Env; Variables: Variables }>()

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
})

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

// Register new user
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, password } = c.req.valid('json')

  // Check if username already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  )
    .bind(username)
    .first()

  if (existing) {
    return c.json({ error: 'Username already exists' }, 400)
  }

  // Check if this is the first user (will be admin)
  const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{
    count: number
  }>()
  const isFirstUser = !userCount || userCount.count === 0

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const role = isFirstUser ? 'admin' : 'adult'

  await c.env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
  )
    .bind(id, username, passwordHash, role)
    .run()

  const token = await signJWT(
    { sub: id, username, role },
    c.env.JWT_SECRET
  )

  return c.json({
    token,
    user: { id, username, role },
    message: isFirstUser ? 'Account created as admin (first user)' : 'Account created',
  })
})

// Login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json')

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ?'
  )
    .bind(username)
    .first<User>()

  if (!user) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  const token = await signJWT(
    { sub: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  )

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  })
})

// Get current user
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('userRecord')

  return c.json({
    id: user.id,
    username: user.username,
    role: user.role,
    created_at: user.created_at,
  })
})

// Logout (client-side token removal, but we can track if needed)
auth.post('/logout', authMiddleware, async (c) => {
  return c.json({ message: 'Logged out successfully' })
})

export default auth
