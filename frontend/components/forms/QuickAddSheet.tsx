'use client'

import { useState, useEffect, useRef } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { X, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { cn, formatINR } from '@/lib/utils'
import { useQuickAdd } from '@/context/QuickAddContext'
import { useCategories } from '@/hooks/useCategories'
import { useRecentEntries, invalidateRecentEntryCache } from '@/hooks/useRecentEntries'
import { api } from '@/lib/api'
import { Keypad, type KeypadKey } from './Keypad'
import { CategoryGrid } from './CategoryGrid'
import { applyKey, formatDisplay, parseAmount, toRawString } from '@/lib/keypad'
import { readLastUsedCategory, writeLastUsedCategory } from '@/hooks/useLastUsedCategory'
import { readLastUsedAmount, writeLastUsedAmount } from '@/hooks/useLastUsedAmount'

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind   = 'expense' | 'income'
type Status = 'idle' | 'submitting' | 'success' | 'error'

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickAddSheet() {
  const { isOpen, close, notifyTransactionSaved } = useQuickAdd()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [rawAmount,   setRawAmount]   = useState('0')
  const [kind,        setKind]        = useState<Kind>('expense')
  const [categoryId,  setCategoryId]  = useState<number | null>(null)
  const [note,        setNote]        = useState('')
  const [noteOpen,    setNoteOpen]    = useState(false)
  const [noteFocused, setNoteFocused] = useState(false)
  const [status,      setStatus]      = useState<Status>('idle')

  const noteRef      = useRef<HTMLInputElement>(null)
  // Keep a ref to categoryId so the open-effect can read it without dep churn
  const categoryIdRef = useRef<number | null>(categoryId)
  useEffect(() => { categoryIdRef.current = categoryId }, [categoryId])

  // ── Categories ──────────────────────────────────────────────────────────────
  const { categories, loading: catLoading } = useCategories(kind)

  // Auto-select on load/kind change — prefer last-used > first available
  useEffect(() => {
    if (categories.length === 0) return
    setCategoryId((prev) => {
      if (prev !== null && categories.some((c) => c.id === prev)) return prev
      const lastUsed = readLastUsedCategory(kind)
      if (lastUsed !== null && categories.some((c) => c.id === lastUsed)) return lastUsed
      return categories[0].id
    })
  }, [categories, kind])

  // ── Amount pre-fill when category changes while sheet is open ───────────────
  // (Opening pre-fill is handled in the open effect below)
  const sheetJustOpened = useRef(false)
  useEffect(() => {
    if (sheetJustOpened.current) {
      // Skip — the open effect already pre-filled the amount
      sheetJustOpened.current = false
      return
    }
    if (!isOpen || categoryId === null) return
    // Only pre-fill if the user hasn't typed anything yet
    if (rawAmount !== '0') return
    const last = readLastUsedAmount(categoryId)
    if (last !== null) setRawAmount(toRawString(last))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // ── Recent entries (for the chips row) ──────────────────────────────────────
  const recentEntries = useRecentEntries()

  // ── Reset form on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      sheetJustOpened.current = true
      setKind('expense')
      setNote('')
      setNoteOpen(false)
      setNoteFocused(false)
      setStatus('idle')

      // Pre-fill amount from last used for the currently selected category
      const currentCatId = categoryIdRef.current
      const lastAmount = currentCatId !== null ? readLastUsedAmount(currentCatId) : null
      setRawAmount(lastAmount !== null ? toRawString(lastAmount) : '0')
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lock body scroll while sheet is open (iOS-safe: position:fixed) ─────────
  useBodyScrollLock(isOpen)

  // ── Keypad handler ──────────────────────────────────────────────────────────
  function handleKey(key: KeypadKey) {
    setRawAmount((prev) => applyKey(prev, key))
  }

  // ── Kind toggle ─────────────────────────────────────────────────────────────
  function handleKindChange(next: Kind) {
    setKind(next)
    // When kind switches, rawAmount resets to '0' so new category's amount can pre-fill
    setRawAmount('0')
  }

  // ── Category selection (persists last-used) ──────────────────────────────────
  function handleSelectCategory(id: number) {
    setCategoryId(id)
    writeLastUsedCategory(kind, id)
  }

  // ── Recent chip fill ─────────────────────────────────────────────────────────
  function handleRecentChip(tx: { kind: string; category: { id: number }; amount: number }) {
    if (tx.kind !== kind) {
      setKind(tx.kind as Kind)
      // rawAmount reset handled by kind-change effect indirectly; set explicitly
    }
    setCategoryId(tx.category.id)
    setRawAmount(toRawString(tx.amount))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  const amount    = parseAmount(rawAmount)
  const canSubmit = amount > 0 && categoryId !== null && status === 'idle' && !catLoading

  async function handleSubmit() {
    if (!canSubmit) return

    setStatus('submitting')
    try {
      await api.transactions.create({
        amount,
        kind,
        category_id: categoryId!,
        note: note.trim() || undefined,
      })
      // Persist last-used amount for this category
      writeLastUsedAmount(categoryId!, amount)
      notifyTransactionSaved()
      invalidateRecentEntryCache()

      setStatus('success')
      setTimeout(() => {
        close()
        setTimeout(() => setStatus('idle'), 300)
      }, 500)
    } catch (err) {
      console.error('[QuickAdd] Submit failed:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  // ── Derived display ─────────────────────────────────────────────────────────
  const amountIsZero = rawAmount === '0'
  const showKeypad   = !noteFocused

  const submitLabel = (() => {
    if (status === 'submitting') return 'Saving…'
    if (status === 'success')    return 'Saved!'
    if (status === 'error')      return 'Error — retry'
    if (catLoading)              return 'Loading categories…'
    if (amount > 0) return `Save ${kind === 'expense' ? 'Expense' : 'Income'}`
    return 'Enter an amount'
  })()

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
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
        aria-label="Add transaction"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[93svh]',
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
            onClick={close}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-label-secondary active:bg-white/20 transition-colors"
          >
            <X size={15} strokeWidth={2.5} aria-hidden />
          </button>
          <h2 className="text-[15px] font-semibold text-label-primary tracking-tight">
            New Transaction
          </h2>
          <div className="w-8" aria-hidden />
        </div>

        {/* Scrollable body — min-h-0 is critical on iOS: allows flex-1 to
            shrink below its content size so the keypad (flex-shrink-0) is
            never pushed off-screen or clipped */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide"
             style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ── Recent chips ──────────────────────────────────────────────── */}
          {recentEntries.length > 0 && (
            <div className="px-5 mb-4">
              <p className="mb-2 text-[10.5px] font-semibold text-label-tertiary uppercase tracking-widest">
                Recent
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-0.5">
                {recentEntries.map((tx) => (
                  <button
                    key={`${tx.category.id}:${tx.amount}`}
                    onPointerDown={(e) => { e.preventDefault(); handleRecentChip(tx) }}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-2',
                      'px-3 py-2 rounded-2xl',
                      'transition-all duration-100 active:scale-[0.94]',
                    )}
                    style={{ background: `${tx.category.color}18` }}
                    aria-label={`Fill ${tx.category.name} ${formatINR(tx.amount)}`}
                  >
                    <span className="text-[15px] leading-none select-none" aria-hidden>
                      {tx.category.icon}
                    </span>
                    <div className="text-left">
                      <p className="text-[11px] font-semibold text-label-primary leading-none">
                        {tx.category.name}
                      </p>
                      <p className={cn(
                        'text-[10px] font-medium leading-none mt-0.5',
                        tx.kind === 'expense' ? 'text-expense/80' : 'text-income/80',
                      )}>
                        {formatINR(tx.amount, true)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount display */}
          <div className="flex flex-col items-center px-6 pt-1 pb-4">
            <p
              className={cn(
                'font-bold tabular-nums tracking-[-0.03em] leading-none transition-colors duration-150',
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
            {!amountIsZero && status === 'idle' && (
              <div className="mt-1 w-0.5 h-4 bg-accent/70 rounded animate-[blink_1s_step-end_infinite]" />
            )}
          </div>

          {/* Kind toggle */}
          <div className="flex justify-center px-4 mb-5">
            <div className="flex bg-white/[0.07] rounded-full p-[3px] gap-[3px]">
              {(['expense', 'income'] as Kind[]).map((k) => {
                const active = kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    onPointerDown={(e) => { e.preventDefault(); handleKindChange(k) }}
                    className={cn(
                      'px-6 py-[7px] rounded-full text-[13px] font-semibold capitalize transition-all duration-200',
                      active
                        ? k === 'expense'
                          ? 'bg-expense text-[#0A0A0A] shadow-sm'
                          : 'bg-income  text-[#0A0A0A] shadow-sm'
                        : 'text-label-secondary',
                    )}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
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
            <button
              type="button"
              onClick={() => {
                const next = !noteOpen
                setNoteOpen(next)
                if (next) setTimeout(() => noteRef.current?.focus(), 50)
              }}
              className="flex items-center gap-1.5 text-[13px] font-medium text-label-tertiary active:text-label-secondary transition-colors"
            >
              {noteOpen
                ? <ChevronUp   size={14} strokeWidth={2} aria-hidden />
                : <ChevronDown size={14} strokeWidth={2} aria-hidden />
              }
              {note.trim() || 'Add a note'}
            </button>

            {noteOpen && (
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
                  'mt-2.5 w-full bg-white/[0.07] rounded-xl px-4 py-3',
                  'text-[14px] text-label-primary placeholder:text-label-tertiary',
                  'border border-white/10 focus:border-accent/50 focus:outline-none',
                  'transition-colors duration-150',
                )}
              />
            )}
          </div>

          <div className="h-3" />
        </div>

        {/* Submit button */}
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
              'text-[15px] font-semibold transition-all duration-200',
              status === 'success'
                ? 'bg-income text-[#0A0A0A]'
              : status === 'error'
                ? 'bg-expense/80 text-white'
              : canSubmit
                ? kind === 'expense'
                  ? 'bg-accent text-white active:scale-[0.97] shadow-lg shadow-accent/25'
                  : 'bg-income text-[#0A0A0A] active:scale-[0.97] shadow-lg shadow-income/20'
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
