'use client'

import { useState, useEffect, useRef } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { X, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { writeLastUsedCategory } from '@/hooks/useLastUsedCategory'
import { api, type Transaction } from '@/lib/api'
import { CategoryGrid } from './CategoryGrid'
import { Keypad, type KeypadKey } from './Keypad'
import { applyKey, formatDisplay, parseAmount } from '@/lib/keypad'

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'submitting' | 'success' | 'error'

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditTransactionSheetProps {
  tx:       Transaction | null   // null = closed
  onClose:  () => void
  onSaved:  (updated: Transaction) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditTransactionSheet({ tx, onClose, onSaved }: EditTransactionSheetProps) {
  const isOpen = tx !== null

  const [rawAmount,   setRawAmount]   = useState('0')
  const [categoryId,  setCategoryId]  = useState<number | null>(null)
  const [note,        setNote]        = useState('')
  const [noteFocused, setNoteFocused] = useState(false)
  const [status,      setStatus]      = useState<Status>('idle')

  const noteRef = useRef<HTMLInputElement>(null)

  // ── Populate fields when tx changes ─────────────────────────────────────────
  useEffect(() => {
    if (tx) {
      // Convert float amount to raw string (strip trailing .00)
      const raw = Number.isInteger(tx.amount)
        ? String(tx.amount)
        : tx.amount.toFixed(2).replace(/\.?0+$/, '')
      setRawAmount(raw)
      setCategoryId(tx.category.id)
      setNote(tx.note ?? '')
      setNoteFocused(false)
      setStatus('idle')
    }
  }, [tx])

  // ── Categories for the same kind as tx ──────────────────────────────────────
  const kind = tx?.kind ?? 'expense'
  const { categories, loading: catLoading } = useCategories(kind)

  // ── Lock body scroll while open (iOS-safe: position:fixed) ─────────────────
  useBodyScrollLock(isOpen)

  // ── Keypad ────────────────────────────────────────────────────────────────────
  function handleKey(key: KeypadKey) {
    setRawAmount((prev) => applyKey(prev, key))
  }

  // ── Category selection (saves last-used) ─────────────────────────────────────
  function handleSelectCategory(id: number) {
    setCategoryId(id)
    writeLastUsedCategory(kind, id)
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const amount     = parseAmount(rawAmount)
  const canSubmit  = amount > 0 && categoryId !== null && status === 'idle'

  async function handleSubmit() {
    if (!canSubmit || !tx) return

    setStatus('submitting')
    try {
      const updated = await api.transactions.update(tx.id, {
        amount:      amount,
        category_id: categoryId!,
        note:        note.trim() || undefined,
      })
      setStatus('success')
      onSaved(updated)
      setTimeout(() => onClose(), 400)
    } catch (err) {
      console.error('[EditSheet] Update failed:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const amountIsZero  = rawAmount === '0'
  const showKeypad    = !noteFocused

  const submitLabel = (() => {
    if (status === 'submitting') return 'Saving…'
    if (status === 'success')    return 'Saved!'
    if (status === 'error')      return 'Error — retry'
    if (amount > 0)              return 'Save Changes'
    return 'Enter an amount'
  })()

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40',
          'bg-black/70 backdrop-blur-[2px]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit transaction"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'flex flex-col',
          'max-h-[93svh]',
          'bg-[#161618] rounded-t-[28px]',
          'shadow-[0_-4px_40px_rgba(0,0,0,0.6)]',
          'transition-transform duration-300 ease-out will-change-transform',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-2 flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-label-secondary active:bg-white/20 transition-colors"
          >
            <X size={15} strokeWidth={2.5} aria-hidden />
          </button>

          <h2 className="text-[15px] font-semibold text-label-primary tracking-tight">
            Edit Transaction
          </h2>

          <div className="w-8" aria-hidden />
        </div>

        {/* Scrollable body — min-h-0 lets flex-1 shrink so keypad stays visible */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide"
             style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Amount display */}
          <div className="flex flex-col items-center px-6 pt-3 pb-4">
            <p
              className={cn(
                'font-bold tabular-nums transition-colors duration-150',
                'tracking-[-0.03em] leading-none',
                rawAmount.length > 8  ? 'text-[2.25rem]' :
                rawAmount.length > 5  ? 'text-[2.75rem]' :
                                        'text-[3.25rem]',
                amountIsZero
                  ? 'text-white/20'
                  : kind === 'expense' ? 'text-white' : 'text-income',
              )}
            >
              {formatDisplay(rawAmount)}
            </p>

            {/* Kind badge — read-only in edit mode */}
            <span className={cn(
              'mt-2 px-3 py-0.5 rounded-full text-[11px] font-semibold capitalize',
              kind === 'expense'
                ? 'bg-expense/15 text-expense'
                : 'bg-income/15  text-income',
            )}>
              {kind}
            </span>
          </div>

          {/* Category */}
          <div className="mb-4">
            <p className="px-5 mb-2.5 text-[10.5px] font-semibold text-label-tertiary uppercase tracking-widest">
              Category
            </p>
            <CategoryGrid
              categories={categories}
              selected={categoryId}
              loading={catLoading}
              onSelect={handleSelectCategory}
            />
          </div>

          {/* Note */}
          <div className="px-5 mb-4">
            <p className="mb-2 text-[10.5px] font-semibold text-label-tertiary uppercase tracking-widest">
              Note
            </p>
            <input
              ref={noteRef}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              placeholder="What was this for?"
              maxLength={80}
              className={cn(
                'w-full',
                'bg-white/[0.07] rounded-xl',
                'px-4 py-3',
                'text-[14px] text-label-primary',
                'placeholder:text-label-tertiary',
                'border border-white/10',
                'focus:border-accent/50 focus:outline-none',
                'transition-colors duration-150',
              )}
            />
          </div>

          <div className="h-2" />
        </div>

        {/* Submit */}
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full h-12 rounded-2xl',
              'flex items-center justify-center gap-2',
              'text-[15px] font-semibold',
              'transition-all duration-200',
              status === 'success'
                ? 'bg-income text-[#0A0A0A]'
              : status === 'error'
                ? 'bg-expense/80 text-white'
              : canSubmit
                ? 'bg-accent text-white active:scale-[0.97] shadow-lg shadow-accent/25'
                : 'bg-white/[0.07] text-label-tertiary',
            )}
          >
            {status === 'submitting' && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {status === 'success'    && <Check   size={16} strokeWidth={2.5}         aria-hidden />}
            {submitLabel}
          </button>
        </div>

        {/* Keypad */}
        {showKeypad && (
          <div className="flex-shrink-0 pb-safe">
            <Keypad onKey={handleKey} />
          </div>
        )}

        {!showKeypad && <div className="flex-shrink-0 pb-safe" />}
      </div>
    </>
  )
}
