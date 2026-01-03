import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../src/contexts/AuthContext'
import { useTheme } from '../src/theme/ThemeContext'
import { useConversations } from '../src/hooks/useChat'
import { Conversation } from '../src/lib/api'

export default function ChatScreen() {
  const { user, logout } = useAuth()
  const { colors, toggleTheme, isDark } = useTheme()
  const { conversations, isLoading, loadConversations, createConversation, deleteConversation } =
    useConversations()

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const handleNewChat = async () => {
    const conversation = await createConversation()
    if (conversation) {
      router.push(`/conversation/${conversation.id}`)
    }
  }

  const handleSelectConversation = (id: string) => {
    router.push(`/conversation/${id}`)
  }

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${conversation.title || 'New conversation'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(conversation.id),
        },
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.card }]}
      onPress={() => handleSelectConversation(item.id)}
      onLongPress={() => handleDeleteConversation(item)}
    >
      <View style={styles.conversationIcon}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.mutedForeground} />
      </View>
      <View style={styles.conversationContent}>
        <Text style={[styles.conversationTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || 'New conversation'}
        </Text>
        <Text style={[styles.conversationDate, { color: colors.mutedForeground }]}>
          {formatDate(item.updated_at)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            Hello, {user?.username}
          </Text>
          <Text style={[styles.role, { color: colors.mutedForeground }]}>
            {user?.role}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversations list */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadConversations}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Tap the + button to start chatting
            </Text>
          </View>
        }
      />

      {/* New chat FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleNewChat}
      >
        <Ionicons name="add" size={28} color={colors.primaryForeground} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
  },
  role: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  conversationIcon: {
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
})
