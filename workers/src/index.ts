import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import adminRoutes from './routes/admin'
import searchRoutes from './routes/search'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow localhost for development and your production domain
      if (!origin) return '*'
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin
      if (origin.includes('chathome') || origin.includes('pages.dev')) return origin
      return null
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
)

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'ChatHome API',
    version: '1.0.0',
    status: 'healthy',
  })
})

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/search', searchRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
