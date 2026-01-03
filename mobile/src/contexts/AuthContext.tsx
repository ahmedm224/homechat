import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { authApi, User } from '../lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'chathome_token'
const USER_KEY = 'chathome_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth()
  }, [])

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      const storedUser = await SecureStore.getItemAsync(USER_KEY)

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))

        // Verify token is still valid
        try {
          const currentUser = await authApi.me(storedToken)
          setUser(currentUser)
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(currentUser))
        } catch {
          // Token invalid, clear auth
          await clearAuth()
        }
      }
    } catch (error) {
      console.error('Failed to load auth:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAuth = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    setToken(null)
    setUser(null)
  }

  const login = useCallback(async (username: string, password: string) => {
    const response = await authApi.login(username, password)
    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const response = await authApi.register(username, password)
    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try {
        await authApi.logout(token)
      } catch {
        // Ignore logout errors
      }
    }
    await clearAuth()
  }, [token])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
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
