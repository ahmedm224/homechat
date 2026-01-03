import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme/ThemeContext'
import { Message } from '../lib/api'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const { colors, isDark } = useTheme()
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content)
    Alert.alert('Copied', 'Message copied to clipboard')
  }

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      {!isUser && (
        <Image
          source={require('../../assets/icon.png')}
          style={styles.avatar}
        />
      )}
      <View style={styles.contentWrapper}>
        <TouchableOpacity
          onLongPress={handleCopy}
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.muted },
          ]}
        >
          <Text
            style={[
              styles.text,
              isUser
                ? { color: colors.primaryForeground }
                : { color: colors.foreground },
            ]}
          >
            {message.content}
            {isStreaming && !message.content && '...'}
            {isStreaming && message.content && (
              <Text style={styles.cursor}>|</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
      {isUser && (
        <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="person" size={16} color={colors.primaryForeground} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  containerUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    opacity: 0.5,
  },
})
