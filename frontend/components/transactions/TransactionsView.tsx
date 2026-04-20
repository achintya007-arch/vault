'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Header }              from '@/components/layout/Header'
import { PageShell }           from '@/components/layout/PageShell'
import { Card }                from '@/components/ui/Card'
import { UndoToast }           from '@/components/ui/UndoToast'
import { SwipeableRow }        from './SwipeableRow'
import { EditTransactionSheet } from '@/components/forms/EditTransactionSheet'
import { useUndoDelete }       from '@/hooks/useUndoDelete'
import { useQuickAdd }         from '@/context/QuickAddContext'
import { api, type Transaction } from '@/lib/api'
import { toMonthParam, shiftMonth, monthLabelFromParam } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type KindFilter = 'all' | 'income' | 'expense'

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [kindFilter,   setKindFilter]   = useState<KindFilter>('all')
  const [search,       setSearch]       = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [editingTx,    setEditingTx]    = useState<Transaction | null>(null)

  // Month navigation — starts on current month, derived CLIENT-SIDE
  const [month, setMonth] = useState<string>(toMonthParam)
  const isCurrentMonth    = month === toMonthParam()

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(() => {
    setLoading(true)
    setError(null)

    api.transactions
      .list({ month, limit: 200 })
      .then(setTransactions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [month])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // ── Refresh when QuickAdd saves (only if we're on the current month) ──────────
  const { txSavedAt } = useQuickAdd()
  useEffect(() => {
    if (txSavedAt === 0) return
    if (isCurrentMonth) fetchTransactions()
  }, [txSavedAt, isCurrentMonth, fetchTransactions])

  // ── Undo delete ──────────────────────────────────────────────────────────────
  const { pendingTx, scheduleDelete, undo } = useUndoDelete({
    onConfirm: (id) => {
      api.transactions.delete(id).catch((err) => {
        console.error('[Transactions] Delete failed:', err)
        fetchTransactions()
      })
    },
  })

  function handleDelete(id: number) {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    scheduleDelete(tx)
  }

  function handleUndo() {
    const tx = undo()
    if (tx) {
      setTransactions((prev) => {
        // Re-insert at chronological position (sorted by date desc, id desc)
        const next = [...prev, tx]
        return next.sort((a, b) =>
          a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1,
        )
      })
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function handleSaved(updated: Transaction) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    )
  }

  // ── Client-side filter + search ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = transactions

    // Kind filter
    if (kindFilter !== 'all') {
      list = list.filter((tx) => tx.kind === kindFilter)
    }

    // Search — match note or category name, case-insensitive
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (tx) =>
          tx.note?.toLowerCase().includes(q) ||
          tx.category.name.toLowerCase().includes(q),
      )
    }

    return list
  }, [transactions, kindFilter, search])

  // ── Month nav helpers ─────────────────────────────────────────────────────────
  function prevMonth() { setMonth((m) => shiftMonth(m, -1)) }
  function nextMonth() { setMonth((m) => shiftMonth(m, +1)) }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Header title="Transactions" />

      <PageShell className="space-y-3 animate-fade-up">

        {/* ── Month navigation ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-full text-label-secondary active:bg-surface-overlay transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          </button>

          <div className="text-center">
            <p className="text-[15px] font-semibold text-label-primary">
              {monthLabelFromParam(month)}
            </p>
            {isCurrentMonth && (
              <p className="text-[11px] text-accent-light font-medium -mt-0.5">
                This month
              </p>
            )}
          </div>

          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Next month"
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
              isCurrentMonth
                ? 'text-label-tertiary/40 cursor-not-allowed'
                : 'text-label-secondary active:bg-surface-overlay',
            )}
          >
            <ChevronRight size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* ── Filter row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Kind filter chips */}
          <div className="flex gap-1.5 flex-1">
            {(['all', 'income', 'expense'] as KindFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setKindFilter(f)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-all',
                  kindFilter === f
                    ? f === 'income'
                      ? 'bg-income/20 text-income'
                      : f === 'expense'
                      ? 'bg-expense/20 text-expense'
                      : 'bg-accent text-white'
                    : 'bg-surface text-label-secondary',
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* Search toggle */}
          <button
            onClick={() => {
              setSearchOpen((o) => {
                if (o) setSearch('')
                return !o
              })
            }}
            aria-label={searchOpen ? 'Close search' : 'Search'}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
              searchOpen
                ? 'bg-accent/20 text-accent-light'
                : 'bg-surface text-label-secondary',
            )}
          >
            {searchOpen ? <X size={14} strokeWidth={2.5} /> : <Search size={14} strokeWidth={2} />}
          </button>
        </div>

        {/* ── Search input ───────────────────────────────────────────────── */}
        {searchOpen && (
          <div className="relative animate-scale-in">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-label-tertiary pointer-events-none"
              aria-hidden
            />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or categories…"
              className={cn(
                'w-full pl-9 pr-4 py-2.5',
                'bg-surface rounded-xl',
                'text-[14px] text-label-primary',
                'placeholder:text-label-tertiary',
                'border border-border',
                'focus:border-accent/50 focus:outline-none',
                'transition-colors duration-150',
              )}
            />
          </div>
        )}

        {/* ── Transaction list ───────────────────────────────────────────── */}
        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <Card className="text-center py-8">
            <p className="text-expense text-[14px] font-medium mb-1">Failed to load</p>
            <p className="text-label-tertiary text-[12px] font-mono">{error}</p>
          </Card>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} kindFilter={kindFilter} />
        ) : (
          <Card flush>
            {filtered.map((tx, i) => (
              <div
                key={tx.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
              >
                <SwipeableRow
                  tx={tx}
                  onDelete={handleDelete}
                  onEdit={setEditingTx}
                />
                {i < filtered.length - 1 && (
                  <div className="mx-4 border-t border-border" />
                )}
              </div>
            ))}
          </Card>
        )}

      </PageShell>

      {/* ── Edit sheet ───────────────────────────────────────────────────── */}
      <EditTransactionSheet
        tx={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={handleSaved}
      />

      {/* ── Undo toast ───────────────────────────────────────────────────── */}
      <UndoToast tx={pendingTx} onUndo={handleUndo} />
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ search, kindFilter }: { search: string; kindFilter: KindFilter }) {
  if (search) {
    return (
      <Card className="flex flex-col items-center justify-center py-14 text-center">
        <div className="text-3xl mb-3 select-none" aria-hidden>🔍</div>
        <p className="text-[14px] font-semibold text-label-primary mb-1">No results</p>
        <p className="text-[12px] text-label-secondary">
          No transactions matching &ldquo;{search}&rdquo;
        </p>
      </Card>
    )
  }

  const msg =
    kindFilter === 'income'  ? 'No income this month.' :
    kindFilter === 'expense' ? 'No expenses this month.' :
                               'No transactions this month.'

  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4 select-none" aria-hidden>📋</div>
      <p className="text-[15px] font-semibold text-label-primary mb-1">{msg}</p>
      <p className="text-[13px] text-label-secondary">
        Tap <strong className="text-label-primary">+</strong> to add one.
      </p>
    </Card>
  )
}

function ListSkeleton() {
  return (
    <Card flush>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-2xl shimmer flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 shimmer rounded-full" />
            <div className="h-2.5 w-20 shimmer rounded-full" />
          </div>
          <div className="h-4 w-16 shimmer rounded-full" />
        </div>
      ))}
    </Card>
  )
}
