'use client'

import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | '⌫'

interface KeypadProps {
  onKey: (key: KeypadKey) => void
}

// ── Layout ────────────────────────────────────────────────────────────────────

const ROWS: KeypadKey[][] = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
]

// ── Component ─────────────────────────────────────────────────────────────────

export function Keypad({ onKey }: KeypadProps) {
  function handlePress(key: KeypadKey) {
    // Haptic feedback — silently ignored on unsupported devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(6)
    }
    onKey(key)
  }

  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-2">
      {ROWS.flat().map((key) => (
        <KeyButton key={key} value={key} onPress={() => handlePress(key)} />
      ))}
    </div>
  )
}

// ── Key button ────────────────────────────────────────────────────────────────

interface KeyButtonProps {
  value:   KeypadKey
  onPress: () => void
}

function KeyButton({ value, onPress }: KeyButtonProps) {
  const isDelete = value === '⌫'

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // Fire immediately on pointer down for instant feel
        e.preventDefault()
        onPress()
      }}
      aria-label={isDelete ? 'Delete' : value}
      className={cn(
        // Size & shape
        'h-[3.75rem] rounded-2xl',
        'flex items-center justify-center',
        // Typography
        'text-[1.375rem] font-semibold tracking-tight',
        // Colours
        isDelete
          ? 'bg-surface-elevated/60 text-label-secondary'
          : 'bg-surface-elevated text-label-primary',
        // Press feedback
        'transition-all duration-75',
        'active:scale-[0.93] active:bg-surface-overlay',
        // Large tap target
        'select-none touch-manipulation',
      )}
    >
      {isDelete ? (
        <Delete size={20} strokeWidth={2} aria-hidden />
      ) : (
        value
      )}
    </button>
  )
}
