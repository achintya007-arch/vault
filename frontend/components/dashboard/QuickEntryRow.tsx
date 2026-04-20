'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Check, X, Loader2 } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'
import { api } from '@/lib/api'
import { loadQuickEntries, removeQuickEntry, type QuickEntry } from '@/lib/quickEntries'
import { invalidateRecentEntryCache } from '@/hooks/useRecentEntries'

// ── Types ─────────────────────────────────────────────────────────────────────

type ChipStatus = 'idle' | 'loading' | 'success' | 'error'

// ── Props ─────────────────────────────────────────────────────────────────────

interface QuickEntryRowProps {
  /** Called after a quick-entry is successfully logged so the dashboard refreshes. */
  onTransactionLogged: () => void
  /** Opens the PinEntrySheet so the user can create a new entry. */
  onAddNew: () => void
  /** Increments whenever an entry is added from PinEntrySheet; causes row to reload. */
  refreshKey: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickEntryRow({ onTransactionLogged, onAddNew, refreshKey }: QuickEntryRowProps) {
  const [entries,    setEntries]    = useState<QuickEntry[]>(() => loadQuickEntries())
  const [chipStatus, setChipStatus] = useState<Record<string, ChipStatus>>({})
  const [editMode,   setEditMode]   = useState(false)

  // Reload from localStorage when a new pin is added
  useEffect(() => {
    setEntries(loadQuickEntries())
  }, [refreshKey])

  // Exit edit mode when user taps anywhere outside the row
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editMode) return
    function handleOutside(e: PointerEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setEditMode(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [editMode])

  // ── Log a quick entry ───────────────────────────────────────────────────────
  const handleTap = useCallback(async (entry: QuickEntry) => {
    if (editMode) return
    setChipStatus((s) => ({ ...s, [entry.id]: 'loading' }))
    try {
      await api.transactions.create({
        amount:      entry.amount,
        kind:        entry.kind,
        category_id: entry.category_id,
        note:        entry.note,
      })
      invalidateRecentEntryCache()
      setChipStatus((s) => ({ ...s, [entry.id]: 'success' }))
      onTransactionLogged()
      setTimeout(() => {
        setChipStatus((s) => ({ ...s, [entry.id]: 'idle' }))
      }, 1500)
    } catch {
      setChipStatus((s) => ({ ...s, [entry.id]: 'error' }))
      setTimeout(() => {
        setChipStatus((s) => ({ ...s, [entry.id]: 'idle' }))
      }, 2000)
    }
  }, [editMode, onTransactionLogged])

  // ── Delete a quick entry ────────────────────────────────────────────────────
  function handleDelete(id: string) {
    removeQuickEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (entries.length <= 1) setEditMode(false)
  }

  // ── Long-press to enter edit mode ───────────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onChipPointerDown() {
    longPressTimer.current = setTimeout(() => {
      navigator.vibrate?.(8)
      setEditMode(true)
    }, 480)
  }

  function onChipPointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={onAddNew}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-2xl',
            'bg-surface border border-dashed border-white/15',
            'text-[13px] text-label-secondary',
            'active:bg-surface-elevated transition-colors',
          )}
        >
          <Plus size={14} strokeWidth={2.5} className="text-accent-light" aria-hidden />
          Pin a quick entry
        </button>
      </div>
    )
  }

  return (
    <div ref={rowRef} className="-mx-4 mb-1">
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-0.5">
        {entries.map((entry) => {
          const status = chipStatus[entry.id] ?? 'idle'
          return (
            <QuickChip
              key={entry.id}
              entry={entry}
              status={status}
              editMode={editMode}
              onTap={() => handleTap(entry)}
              onDelete={() => handleDelete(entry.id)}
              onPointerDown={onChipPointerDown}
              onPointerUp={onChipPointerUp}
            />
          )
        })}

        {/* Add new chip */}
        {!editMode && (
          <button
            onClick={onAddNew}
            aria-label="Add quick entry"
            className={cn(
              'flex-shrink-0 w-[72px] h-[68px]',
              'flex flex-col items-center justify-center gap-1',
              'rounded-2xl border border-dashed border-white/15',
              'text-label-tertiary',
              'active:bg-surface-elevated transition-colors',
            )}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ── QuickChip ─────────────────────────────────────────────────────────────────

interface QuickChipProps {
  entry:         QuickEntry
  status:        ChipStatus
  editMode:      boolean
  onTap:         () => void
  onDelete:      () => void
  onPointerDown: () => void
  onPointerUp:   () => void
}

function QuickChip({ entry, status, editMode, onTap, onDelete, onPointerDown, onPointerUp }: QuickChipProps) {
  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const isError   = status === 'error'

  return (
    <div className="relative flex-shrink-0 select-none">
      <button
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onTap}
        disabled={isLoading || editMode}
        className={cn(
          'w-[72px] h-[68px] rounded-2xl',
          'flex flex-col items-center justify-center gap-0.5',
          'transition-all duration-150',
          isSuccess && 'scale-[0.96]',
          isError   && 'scale-[0.96]',
          !editMode && !isLoading && 'active:scale-[0.93]',
          editMode  && 'animate-[wiggle_0.3s_ease-in-out_infinite]',
        )}
        style={{
          background: isSuccess
            ? 'rgba(52,211,153,0.15)'
            : isError
            ? 'rgba(248,113,113,0.15)'
            : `${entry.category.color}18`,
        }}
        aria-label={`Log ${entry.label} ${entry.kind === 'expense' ? '−' : '+'}${formatINR(entry.amount)}`}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin text-label-secondary" aria-hidden />
        ) : isSuccess ? (
          <Check size={18} strokeWidth={2.5} className="text-income" aria-hidden />
        ) : isError ? (
          <span className="text-[16px] select-none" aria-hidden>!</span>
        ) : (
          <span className="text-[20px] leading-none select-none" aria-hidden>
            {entry.category.icon}
          </span>
        )}

        {!isLoading && (
          <>
            <p className="text-[10px] font-semibold text-label-primary leading-none truncate w-full text-center px-1">
              {entry.label}
            </p>
            <p className={cn(
              'text-[9.5px] font-medium leading-none',
              entry.kind === 'expense' ? 'text-expense/80' : 'text-income/80',
            )}>
              {formatINR(entry.amount, true)}
            </p>
          </>
        )}
      </button>

      {/* Delete badge — shown in edit mode */}
      {editMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label={`Remove ${entry.label}`}
          className={cn(
            'absolute -top-1.5 -right-1.5',
            'w-5 h-5 rounded-full',
            'bg-expense flex items-center justify-center',
            'shadow-md animate-scale-in',
          )}
        >
          <X size={10} strokeWidth={3} className="text-white" aria-hidden />
        </button>
      )}
    </div>
  )
}
