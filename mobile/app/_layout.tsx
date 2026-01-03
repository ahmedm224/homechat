import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext'
import { AuthProvider, useAuth } from '../src/contexts/AuthContext'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { colors, isDark } = useTheme()
  const { isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat"
          options={{
            title: 'ChatHome',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            title: 'Chat',
          }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  )
}
