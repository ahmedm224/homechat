'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Save, Eraser, Brush } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CanvasModalProps {
  onClose: () => void
  onSave: (file: File) => void
}

export default function CanvasModal({ onClose, onSave }: CanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(4)
  const [brushColor, setBrushColor] = useState('#ffffff')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.min(800, window.innerWidth - 40)
    const height = Math.min(500, window.innerHeight - 160)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#111827' // dark background
    ctx.fillRect(0, 0, width, height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctxRef.current = ctx
  }, [])

  useEffect(() => {
    if (!ctxRef.current) return
    ctxRef.current.strokeStyle = brushColor
    ctxRef.current.lineWidth = brushSize
  }, [brushColor, brushSize])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const isTouch = 'touches' in e
    const x = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX
    const y = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY
    return { x: x - rect.left, y: y - rect.top }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const { x, y } = getPos(e)
    ctxRef.current?.beginPath()
    ctxRef.current?.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y } = getPos(e)
    ctxRef.current?.lineTo(x, y)
    ctxRef.current?.stroke()
  }

  const endDrawing = () => {
    setIsDrawing(false)
    ctxRef.current?.closePath()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current!
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    ctxRef.current?.clearRect(0, 0, width, height)
    ctxRef.current!.fillStyle = '#111827'
    ctxRef.current!.fillRect(0, 0, width, height)
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `canvas-${Date.now()}.png`, { type: 'image/png' })
      onSave(file)
      onClose()
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-4xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Brush className="h-4 w-4" />
            <span className="text-sm font-medium">Canvas</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm">Brush</label>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-8 w-8 rounded border border-input bg-background"
              aria-label="Brush color"
            />
            <input
              type="range"
              min={1}
              max={24}
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-40"
              aria-label="Brush size"
            />
            <button
              type="button"
              onClick={clearCanvas}
              className={cn(
                'inline-flex items-center gap-2 rounded-md text-sm border border-input bg-background px-3 py-2 hover:bg-accent'
              )}
            >
              <Eraser className="h-4 w-4" />
              Clear
            </button>
          </div>

          <div className="w-full overflow-auto">
            <canvas
              ref={canvasRef}
              className="border border-border rounded-md touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className={cn('border border-input bg-background hover:bg-accent rounded-md px-3 py-2 text-sm')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={cn('bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm inline-flex items-center gap-2')}
          >
            <Save className="h-4 w-4" />
            Save to attachments
          </button>
        </div>
      </div>
    </div>
  )
}

