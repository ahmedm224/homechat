import React, { useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useTheme } from '../theme/ThemeContext'

type ModelType = 'fast' | 'thinking'

interface ChatInputProps {
  onSend: (
    content: string,
    model: ModelType,
    options?: { attachments?: string[]; webSearch?: boolean }
  ) => void
  onFileUpload?: (uri: string, name: string, type: string) => Promise<{ key: string } | null>
  disabled?: boolean
  isStreaming?: boolean
  onStop?: () => void
}

export function ChatInput({
  onSend,
  onFileUpload,
  disabled,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const { colors } = useTheme()
  const [content, setContent] = useState('')
  const [model, setModel] = useState<ModelType>('fast')
  const [isUploading, setIsUploading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])

  const handleSend = () => {
    if (!content.trim() || disabled) return

    onSend(content.trim(), model, {
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    setContent('')
    setAttachments([])
  }

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0] && onFileUpload) {
      setIsUploading(true)
      try {
        const asset = result.assets[0]
        const fileName = asset.uri.split('/').pop() || 'image.jpg'
        const response = await onFileUpload(asset.uri, fileName, asset.mimeType || 'image/jpeg')
        if (response) {
          setAttachments((prev) => [...prev, response.key])
        }
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    })

    if (!result.canceled && result.assets[0] && onFileUpload) {
      setIsUploading(true)
      try {
        const asset = result.assets[0]
        const response = await onFileUpload(asset.uri, asset.name, asset.mimeType || 'application/octet-stream')
        if (response) {
          setAttachments((prev) => [...prev, response.key])
        }
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
      }
    }
  }

  const toggleModel = () => {
    setModel((prev) => (prev === 'fast' ? 'thinking' : 'fast'))
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {/* Model toggle */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={toggleModel}
            style={[styles.modelButton, { backgroundColor: colors.muted }]}
          >
            <Ionicons
              name={model === 'fast' ? 'flash' : 'bulb'}
              size={16}
              color={colors.foreground}
            />
          </TouchableOpacity>

          {attachments.length > 0 && (
            <View style={[styles.attachmentBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="attach" size={12} color={colors.primaryForeground} />
            </View>
          )}
        </View>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={isUploading || disabled}
            style={styles.iconButton}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Ionicons name="image-outline" size={24} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePickDocument}
            disabled={isUploading || disabled}
            style={styles.iconButton}
          >
            <Ionicons name="document-outline" size={24} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={4000}
            editable={!disabled}
          />

          {isStreaming ? (
            <TouchableOpacity onPress={onStop} style={styles.iconButton}>
              <Ionicons name="stop-circle" size={28} color={colors.destructive} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!content.trim() || disabled}
              style={styles.iconButton}
            >
              <Ionicons
                name="send"
                size={24}
                color={content.trim() && !disabled ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderTopWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  modelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attachmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
})
