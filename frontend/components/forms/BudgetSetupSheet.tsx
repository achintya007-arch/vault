'use client'

import { useState, useEffect } from 'react'
import { X, Check, Loader2, Trash2 } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'
import { api, type Budget } from '@/lib/api'
import { Keypad, type KeypadKey } from './Keypad'
import { applyKey, formatDisplay, parseAmount, toRawString } from '@/lib/keypad'

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'saving' | 'saved' | 'deleting' | 'error'

// ── Props ─────────────────────────────────────────────────────────────────────

interface BudgetSetupSheetProps {
  isOpen:    boolean
  onClose:   () => void
  existing:  Budget | null
  onSaved:   (budget: Budget) => void
  onDeleted: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BudgetSetupSheet({
  isOpen,
  onClose,
  existing,
  onSaved,
  onDeleted,
}: BudgetSetupSheetProps) {
  const [rawAmount, setRawAmount] = useState('0')
  const [status,    setStatus]    = useState<Status>('idle')

  const isEditing = existing !== null

  // Populate from existing budget when opening
  useEffect(() => {
    if (isOpen) {
      setRawAmount(existing ? toRawString(existing.monthly_limit) : '0')
      setStatus('idle')
    }
  }, [isOpen, existing])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function handleKey(key: KeypadKey) {
    setRawAmount((prev) => applyKey(prev, key))
  }

  const amount   = parseAmount(rawAmount)
  const canSave  = amount > 0 && status === 'idle'
  const unchanged = isEditing && existing !== null && amount === existing.monthly_limit

  async function handleSave() {
    if (!canSave || unchanged) return
    setStatus('saving')
    try {
      const budget = await api.budget.set(amount)
      setStatus('saved')
      onSaved(budget)
      setTimeout(() => onClose(), 400)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  async function handleDelete() {
    if (status !== 'idle') return
    setStatus('deleting')
    try {
      await api.budget.delete()
      onDeleted()
      onClose()
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const saveLabel = (() => {
    if (status === 'saving')   return 'Saving…'
    if (status === 'saved')    return 'Saved!'
    if (status === 'error')    return 'Error — retry'
    if (unchanged)             return 'No changes'
    if (isEditing && amount > 0) return `Update to ${formatINR(amount, true)}/mo`
    if (amount > 0)            return `Set ${formatINR(amount, true)}/mo`
    return 'Enter a budget amount'
  })()

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit monthly budget' : 'Set monthly budget'}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[85dvh]',
          'bg-[#161618] rounded-t-[28px]',
          'shadow-[0_-4px_40px_rgba(0,0,0,0.6)]',
          'transition-transform duration-300 ease-out will-change-transform',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-label-secondary active:bg-white/20 transition-colors"
          >
            <X size={15} strokeWidth={2.5} aria-hidden />
          </button>
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-label-primary tracking-tight">
              Monthly Budget
            </h2>
            <p className="text-[11px] text-label-tertiary mt-0.5">
              Set a spending cap for this month
            </p>
          </div>
          <div className="w-8" aria-hidden />
        </div>

        {/* Amount display */}
        <div className="flex flex-col items-center px-6 pt-2 pb-6 flex-shrink-0">
          <p
            className={cn(
              'font-bold tabular-nums tracking-[-0.03em] leading-none transition-colors duration-150',
              rawAmount.length > 8 ? 'text-[2.25rem]' :
              rawAmount.length > 5 ? 'text-[2.75rem]' :
                                     'text-[3.25rem]',
              rawAmount === '0' ? 'text-white/20' : 'text-label-primary',
            )}
          >
            {formatDisplay(rawAmount)}
          </p>
          <p className="mt-2 text-[12px] text-label-tertiary">per month</p>
        </div>

        {/* Save button */}
        <div className="flex-shrink-0 px-4 pb-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || unchanged}
            className={cn(
              'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
              'text-[15px] font-semibold transition-all duration-200',
              status === 'saved'
                ? 'bg-income text-[#0A0A0A]'
              : status === 'error'
                ? 'bg-expense/80 text-white'
              : canSave && !unchanged
                ? 'bg-accent text-white active:scale-[0.97] shadow-lg shadow-accent/25'
                : 'bg-white/[0.07] text-label-tertiary',
            )}
          >
            {status === 'saving'  && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {status === 'saved'   && <Check   size={16} strokeWidth={2.5}         aria-hidden />}
            {saveLabel}
          </button>

          {/* Delete budget (only when editing) */}
          {isEditing && status === 'idle' && (
            <button
              type="button"
              onClick={handleDelete}
              className={cn(
                'w-full mt-2 h-10 rounded-xl flex items-center justify-center gap-1.5',
                'text-[13px] font-medium text-expense/70',
                'active:text-expense transition-colors',
              )}
            >
              {status === 'deleting'
                ? <Loader2 size={13} className="animate-spin" aria-hidden />
                : <Trash2  size={13} aria-hidden />
              }
              Remove budget
            </button>
          )}
        </div>

        {/* Keypad */}
        <div className="flex-shrink-0 pb-safe">
          <Keypad onKey={handleKey} />
        </div>
      </div>
    </>
  )
}
