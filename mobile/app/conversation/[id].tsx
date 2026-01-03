import React, { useEffect, useRef } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { useTheme } from '../../src/theme/ThemeContext'
import { useChat } from '../../src/hooks/useChat'
import { MessageBubble } from '../../src/components/MessageBubble'
import { ChatInput } from '../../src/components/ChatInput'
import { chatApi, Message } from '../../src/lib/api'

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const { colors } = useTheme()
  const flatListRef = useRef<FlatList>(null)

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    loadConversation,
    sendMessage,
    stopStreaming,
  } = useChat(id || null)

  useEffect(() => {
    if (id) {
      loadConversation(id)
    }
  }, [id, loadConversation])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const handleFileUpload = async (uri: string, name: string, type: string) => {
    if (!token) return null
    try {
      return await chatApi.uploadFile(token, uri, name, type)
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSend = (
    content: string,
    model: 'fast' | 'thinking',
    options?: { attachments?: string[]; webSearch?: boolean }
  ) => {
    sendMessage(content, model, options)
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <MessageBubble
      message={item}
      isStreaming={isStreaming && index === messages.length - 1 && item.role === 'assistant'}
    />
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Start a conversation
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Choose Fast mode for quick responses or Thinking mode for complex reasoning.
            </Text>
          </View>
        }
      />

      <ChatInput
        onSend={handleSend}
        onFileUpload={handleFileUpload}
        disabled={isStreaming}
        isStreaming={isStreaming}
        onStop={stopStreaming}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    padding: 12,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
})
