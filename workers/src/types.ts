export interface Env {
  DB: D1Database
  FILES: R2Bucket
  OPENAI_API_KEY: string
  SCRAPINGDOG_API_KEY: string
  JWT_SECRET: string
  ENVIRONMENT: string
}

export interface User {
  id: string
  username: string
  password_hash: string
  role: 'admin' | 'adult' | 'kid'
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model: string | null
  attachments: string | null
  created_at: string
}

export interface UserMemory {
  id: string
  user_id: string
  key: string
  value: string
  created_at: string
}

export interface JWTPayload {
  sub: string
  username: string
  role: 'admin' | 'adult' | 'kid'
  exp: number
  iat: number
}

export type ModelType = 'fast' | 'thinking'

export interface ChatRequest {
  content: string
  model: ModelType
  attachments?: string[]
  webSearch?: boolean
}
