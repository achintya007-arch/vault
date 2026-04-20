'use client'

import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/api'

// ── Props ─────────────────────────────────────────────────────────────────────

interface UndoToastProps {
  /** The transaction pending deletion. null = toast hidden. */
  tx:       Transaction | null
  onUndo:   () => void
  /** Grace period in ms — must match useUndoDelete's delay. Default 5000. */
  duration?: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UndoToast({ tx, onUndo, duration = 5000 }: UndoToastProps) {
  const visible = tx !== null

  return (
    // Sits above the bottom nav (60px) with a bit of breathing room
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed inset-x-4 z-[60]',
        'transition-all duration-300 ease-out',
        visible
          ? 'bottom-[calc(60px+env(safe-area-inset-bottom)+12px)] opacity-100 translate-y-0'
          : 'bottom-[calc(60px+env(safe-area-inset-bottom)+12px)] opacity-0 translate-y-4 pointer-events-none',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3',
          'bg-[#2C2C2E] rounded-2xl px-4 py-3',
          'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          'border border-white/10',
        )}
      >
        {/* Category icon */}
        {tx && (
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
            style={{ background: `${tx.category.color}22` }}
            aria-hidden
          >
            {tx.category.icon}
          </span>
        )}

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-label-primary truncate">
            {tx?.category.name ?? ''} deleted
          </p>
          {tx?.note && (
            <p className="text-[11px] text-label-tertiary truncate">{tx.note}</p>
          )}
        </div>

        {/* Undo button */}
        <button
          onClick={onUndo}
          className={cn(
            'flex-shrink-0',
            'px-3 py-1.5 rounded-xl',
            'text-[13px] font-semibold text-accent-light',
            'bg-accent/15',
            'active:bg-accent/25 transition-colors',
          )}
        >
          Undo
        </button>
      </div>

      {/* Progress bar — shrinks from 100% to 0 over `duration` ms */}
      {tx && (
        <div className="mt-1.5 h-[2px] rounded-full bg-white/10 overflow-hidden mx-1">
          <div
            // Use tx.id as key so it resets the animation on each new delete
            key={tx.id}
            className="h-full bg-accent/60 rounded-full"
            style={{
              animation: `shrink-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Keyframe — injected inline so it works without a separate CSS file */}
      <style>{`
        @keyframes shrink-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
