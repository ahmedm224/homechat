import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../src/contexts/AuthContext'
import { useTheme } from '../src/theme/ThemeContext'

export default function Index() {
  const { user, isLoading } = useAuth()
  const { colors } = useTheme()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/chat')
      } else {
        router.replace('/login')
      }
    }
  }, [user, isLoading])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
