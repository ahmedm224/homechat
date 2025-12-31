const API_URL = import.meta.env.VITE_API_URL || 'https://chathome-api.just-ahmed.workers.dev'

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

// Auth API
export const authApi = {
  register: (username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; role: string }; message: string }>(
      '/api/auth/register',
      { method: 'POST', body: { username, password } }
    ),

  login: (username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: { username, password } }
    ),

  me: (token: string) =>
    request<{ id: string; username: string; role: string; created_at: string }>(
      '/api/auth/me',
      { token }
    ),

  logout: (token: string) => request('/api/auth/logout', { method: 'POST', token }),
}

// Chat API
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

export const chatApi = {
  getConversations: (token: string) =>
    request<Conversation[]>('/api/chat/conversations', { token }),

  createConversation: (token: string) =>
    request<Conversation>('/api/chat/conversations', { method: 'POST', token }),

  getConversation: (token: string, id: string) =>
    request<Conversation & { messages: Message[] }>(`/api/chat/conversations/${id}`, { token }),

  deleteConversation: (token: string, id: string) =>
    request(`/api/chat/conversations/${id}`, { method: 'DELETE', token }),

  updateTitle: (token: string, id: string, title: string) =>
    request(`/api/chat/conversations/${id}`, { method: 'PATCH', token, body: { title } }),

  sendMessage: async function* (
    token: string,
    conversationId: string,
    content: string,
    model: 'fast' | 'thinking',
    options?: { attachments?: string[]; webSearch?: boolean }
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

  uploadFile: async (token: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)

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

  getFileUrl: (token: string, key: string) => `${API_URL}/api/chat/files/${key}`,
}

// Search API
export const searchApi = {
  webSearch: (token: string, query: string) =>
    request<{ results: Array<{ title: string; link: string; snippet: string }> }>(
      '/api/search/web',
      { method: 'POST', token, body: { query } }
    ),
}

// Admin API
export const adminApi = {
  getUsers: (token: string) =>
    request<Array<{ id: string; username: string; role: string; created_at: string }>>(
      '/api/admin/users',
      { token }
    ),

  getUser: (token: string, id: string) =>
    request<{
      id: string
      username: string
      role: string
      created_at: string
      stats: { conversations: number; messages: number }
    }>(`/api/admin/users/${id}`, { token }),

  createUser: (token: string, username: string, password: string, role: 'adult' | 'kid') =>
    request<{ user: { id: string; username: string; role: string }; message: string }>(
      '/api/admin/users',
      { method: 'POST', token, body: { username, password, role } }
    ),

  updateRole: (token: string, id: string, role: 'adult' | 'kid') =>
    request(`/api/admin/users/${id}/role`, { method: 'PATCH', token, body: { role } }),

  resetPassword: (token: string, id: string, password: string) =>
    request<{ message: string }>(`/api/admin/users/${id}/password`, {
      method: 'PATCH',
      token,
      body: { password },
    }),

  deleteUser: (token: string, id: string) =>
    request(`/api/admin/users/${id}`, { method: 'DELETE', token }),

  getStats: (token: string) =>
    request<{
      users: number
      conversations: number
      messages: number
      roleDistribution: Array<{ role: string; count: number }>
    }>('/api/admin/stats', { token }),

  getSettings: (token: string) =>
    request<{ allow_registration: boolean }>('/api/admin/settings', { token }),

  updateSettings: (token: string, settings: { allow_registration?: boolean }) =>
    request<{ message: string }>('/api/admin/settings', {
      method: 'PATCH',
      token,
      body: settings,
    }),
}

export { ApiError }
