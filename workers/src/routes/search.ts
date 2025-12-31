import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { webSearch } from '../lib/search'
import { authMiddleware } from '../middleware/auth'
import type { Env, User, JWTPayload } from '../types'

type Variables = {
  user: JWTPayload
  userRecord: User
}

const search = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth middleware
search.use('*', authMiddleware)

const searchSchema = z.object({
  query: z.string().min(1).max(500),
})

// Web search
search.post('/web', zValidator('json', searchSchema), async (c) => {
  const { query } = c.req.valid('json')

  try {
    const results = await webSearch(query, c.env.SCRAPINGDOG_API_KEY)
    return c.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return c.json({ error: 'Search failed' }, 500)
  }
})

export default search
