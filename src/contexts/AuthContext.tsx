import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authApi, ApiError } from '@/lib/api'

interface User {
  id: string
  username: string
  role: 'admin' | 'adult' | 'kid'
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'chathome_token'
const USER_KEY = 'chathome_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [isLoading, setIsLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await authApi.me(token)
        const user: User = {
          id: userData.id,
          username: userData.username,
          role: userData.role as User['role'],
        }
        setUser(user)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setToken(null)
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password)
    const user: User = {
      id: response.user.id,
      username: response.user.username,
      role: response.user.role as User['role'],
    }

    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setToken(response.token)
    setUser(user)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const response = await authApi.register(username, password)
    const user: User = {
      id: response.user.id,
      username: response.user.username,
      role: response.user.role as User['role'],
    }

    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setToken(response.token)
    setUser(user)

    return response.message
  }, [])

  const logout = useCallback(() => {
    if (token) {
      authApi.logout(token).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
