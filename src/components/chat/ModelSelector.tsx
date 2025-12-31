import { cn } from '@/lib/utils'
import { Zap, Brain } from 'lucide-react'

type ModelType = 'fast' | 'thinking'

interface ModelSelectorProps {
  model: ModelType
  onChange: (model: ModelType) => void
  disabled?: boolean
}

export function ModelSelector({ model, onChange, disabled }: ModelSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        type="button"
        onClick={() => onChange('fast')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          model === 'fast'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Zap className="h-4 w-4" />
        Fast
      </button>
      <button
        type="button"
        onClick={() => onChange('thinking')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          model === 'thinking'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Brain className="h-4 w-4" />
        Thinking
      </button>
    </div>
  )
}
