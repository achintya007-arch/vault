'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Check, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { writeLastUsedCategory } from '@/hooks/useLastUsedCategory'
import { addQuickEntry, type QuickEntry } from '@/lib/quickEntries'
import { CategoryGrid } from './CategoryGrid'
import { Keypad, type KeypadKey } from './Keypad'
import { applyKey, formatDisplay, parseAmount } from '@/lib/keypad'
import { readLastUsedCategory } from '@/hooks/useLastUsedCategory'

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind = 'expense' | 'income'

// ── Props ─────────────────────────────────────────────────────────────────────

interface PinEntrySheetProps {
  isOpen:  boolean
  onClose: () => void
  onSaved: (entry: QuickEntry) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PinEntrySheet({ isOpen, onClose, onSaved }: PinEntrySheetProps) {
  const [label,      setLabel]      = useState('')
  const [rawAmount,  setRawAmount]  = useState('0')
  const [kind,       setKind]       = useState<Kind>('expense')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [labelError, setLabelError] = useState(false)

  const labelRef = useRef<HTMLInputElement>(null)

  // ── Categories ────────────────────────────────────────────────────────────────
  const { categories, loading: catLoading } = useCategories(kind)

  useEffect(() => {
    if (categories.length === 0) return
    setCategoryId((prev) => {
      if (prev !== null && categories.some((c) => c.id === prev)) return prev
      const last = readLastUsedCategory(kind)
      if (last !== null && categories.some((c) => c.id === last)) return last
      return categories[0].id
    })
  }, [categories, kind])

  // ── Reset on open ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setLabel('')
      setRawAmount('0')
      setKind('expense')
      setLabelError(false)
      // Focus label after animation settles
      setTimeout(() => labelRef.current?.focus(), 320)
    }
  }, [isOpen])

  // ── Lock scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  function handleKey(key: KeypadKey) {
    setRawAmount((prev) => applyKey(prev, key))
  }

  function handleSelectCategory(id: number) {
    setCategoryId(id)
    writeLastUsedCategory(kind, id)
  }

  function handleSave() {
    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setLabelError(true)
      labelRef.current?.focus()
      return
    }

    const amount = parseAmount(rawAmount)
    if (amount <= 0 || categoryId === null || catLoading) return

    const category = categories.find((c) => c.id === categoryId)
    if (!category) return

    const entry = addQuickEntry({
      label:       trimmedLabel,
      amount,
      kind,
      category_id: categoryId,
      category:    { id: category.id, name: category.name, icon: category.icon, color: category.color },
    })
    onSaved(entry)
    onClose()
  }

  const amount    = parseAmount(rawAmount)
  const canSave   = label.trim().length > 0 && amount > 0 && categoryId !== null && !catLoading

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
        aria-label="New quick entry"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'flex flex-col max-h-[93dvh]',
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
        <div className="flex items-center justify-between px-5 pt-1 pb-3 flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-label-secondary active:bg-white/20 transition-colors"
          >
            <X size={15} strokeWidth={2.5} aria-hidden />
          </button>
          <h2 className="text-[15px] font-semibold text-label-primary tracking-tight flex items-center gap-1.5">
            <Pin size={13} className="text-accent-light" aria-hidden />
            New Quick Entry
          </h2>
          <div className="w-8" aria-hidden />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">

          {/* Label */}
          <div className="px-5 mb-5">
            <p className="mb-2 text-[10.5px] font-semibold text-label-tertiary uppercase tracking-widest">
              Name
            </p>
            <input
              ref={labelRef}
              type="text"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setLabelError(false) }}
              placeholder="e.g. Auto, Mess Lunch, Gym…"
              maxLength={20}
              className={cn(
                'w-full bg-white/[0.07] rounded-xl px-4 py-3',
                'text-[14px] text-label-primary placeholder:text-label-tertiary',
                'border transition-colors duration-150 focus:outline-none',
                labelError
                  ? 'border-expense/60 focus:border-expense'
                  : 'border-white/10 focus:border-accent/50',
              )}
            />
            {labelError && (
              <p className="mt-1.5 text-[11px] text-expense">A name is required.</p>
            )}
          </div>

          {/* Amount display */}
          <div className="flex flex-col items-center px-6 pt-1 pb-4">
            <p
              className={cn(
                'font-bold tabular-nums tracking-[-0.03em] leading-none transition-colors duration-150',
                rawAmount.length > 8 ? 'text-[2.25rem]' :
                rawAmount.length > 5 ? 'text-[2.75rem]' :
                                       'text-[3.25rem]',
                rawAmount === '0'
                  ? 'text-white/20'
                  : kind === 'expense' ? 'text-white' : 'text-income',
              )}
            >
              {formatDisplay(rawAmount)}
            </p>
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
                    onPointerDown={(e) => { e.preventDefault(); setKind(k) }}
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
          <div className="mb-5">
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

          <div className="h-2" />
        </div>

        {/* Save button */}
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
              'text-[15px] font-semibold transition-all duration-200',
              canSave
                ? 'bg-accent text-white active:scale-[0.97] shadow-lg shadow-accent/25'
                : 'bg-white/[0.07] text-label-tertiary',
            )}
          >
            <Pin size={15} aria-hidden />
            Pin this entry
          </button>
        </div>

        {/* Keypad */}
        <div className="flex-shrink-0 pb-safe">
          <Keypad onKey={handleKey} />
        </div>
      </div>
    </>
  )
}
