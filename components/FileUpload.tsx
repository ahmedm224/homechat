'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onUpload: (files: File[]) => void
  children: React.ReactNode
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
}

export default function FileUpload({ 
  onUpload, 
  children, 
  maxFiles = 5, 
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md', '.json', '.csv'],
    'application/json': ['.json'],
    'application/csv': ['.csv'],
  }
}: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles)
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      {children}
    </div>
  )
} 