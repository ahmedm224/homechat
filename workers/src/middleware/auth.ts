import { Context, Next } from 'hono'
import { verifyJWT } from '../lib/jwt'
import type { Env, JWTPayload, User } from '../types'

type Variables = {
  user: JWTPayload
  userRecord: User
}

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyJWT(token, c.env.JWT_SECRET)

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  // Fetch user from DB to ensure they still exist and get latest role
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(payload.sub)
    .first<User>()

  if (!user) {
    return c.json({ error: 'User not found' }, 401)
  }

  c.set('user', { ...payload, role: user.role })
  c.set('userRecord', user)

  await next()
}

export async function adminMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const user = c.get('user')

  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }

  await next()
}
