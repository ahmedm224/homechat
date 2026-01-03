const API_URL = 'https://chathome-api.just-ahmed.workers.dev'

interface ApiOptions {
  method?: string
  body?: unknown
  token?: string | null
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(response.status, error.error || 'Request failed')
  }

  return response.json()
}

// Types
export interface User {
  id: string
  username: string
  role: 'admin' | 'adult' | 'kid'
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  last_message?: string | null
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

// Auth API
export const authApi = {
  register: (username: string, password: string) =>
    request<{ token: string; user: User; message: string }>('/api/auth/register', {
      method: 'POST',
      body: { username, password },
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  me: (token: string) => request<User>('/api/auth/me', { token }),

  logout: (token: string) => request('/api/auth/logout', { method: 'POST', token }),
}

// Chat API
export const chatApi = {
  getConversations: (token: string) =>
    request<Conversation[]>('/api/chat/conversations', { token }),

  createConversation: (token: string) =>
    request<Conversation>('/api/chat/conversations', { method: 'POST', token }),

  getConversation: (token: string, id: string) =>
    request<Conversation & { messages: Message[] }>(`/api/chat/conversations/${id}`, { token }),

  deleteConversation: (token: string, id: string) =>
    request(`/api/chat/conversations/${id}`, { method: 'DELETE', token }),

  sendMessage: async function* (
    token: string,
    conversationId: string,
    content: string,
    model: 'fast' | 'thinking',
    options?: { attachments?: string[]; webSearch?: boolean; signal?: AbortSignal }
  ): AsyncGenerator<{ content?: string; done?: boolean; messageId?: string; error?: string }> {
    const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        model,
        attachments: options?.attachments,
        webSearch: options?.webSearch,
      }),
      signal: options?.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new ApiError(response.status, error.error || 'Request failed')
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          yield data
        } catch {
          // Skip invalid JSON
        }
      }
    }
  },

  uploadFile: async (token: string, uri: string, name: string, type: string) => {
    const formData = new FormData()
    formData.append('file', {
      uri,
      name,
      type,
    } as any)

    const response = await fetch(`${API_URL}/api/chat/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new ApiError(response.status, 'Upload failed')
    }

    return response.json() as Promise<{ key: string; name: string; size: number; type: string }>
  },
}

export { ApiError }
