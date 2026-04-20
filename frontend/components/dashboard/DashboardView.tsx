'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, RefreshCw, TrendingDown } from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { PageShell }       from '@/components/layout/PageShell'
import { Card }            from '@/components/ui/Card'
import { Badge }           from '@/components/ui/Badge'
import { AnimatedNumber }  from '@/components/ui/AnimatedNumber'
import { UndoToast }       from '@/components/ui/UndoToast'
import { SwipeableRow }    from '@/components/transactions/SwipeableRow'
import { QuickEntryRow }   from '@/components/dashboard/QuickEntryRow'
import { BudgetCard }      from '@/components/dashboard/BudgetCard'
import { EditTransactionSheet } from '@/components/forms/EditTransactionSheet'
import { PinEntrySheet }   from '@/components/forms/PinEntrySheet'
import { BudgetSetupSheet } from '@/components/forms/BudgetSetupSheet'
import { useUndoDelete }   from '@/hooks/useUndoDelete'
import { useQuickAdd }     from '@/context/QuickAddContext'
import { api, type Transaction, type MonthlySummary, type Budget } from '@/lib/api'
import { toMonthParam, monthLabel, formatINR } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  const [summary,        setSummary]        = useState<MonthlySummary | null>(null)
  const [transactions,   setTransactions]   = useState<Transaction[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [editingTx,      setEditingTx]      = useState<Transaction | null>(null)
  const [pinSheetOpen,   setPinSheetOpen]   = useState(false)
  const [pinRefreshKey,  setPinRefreshKey]  = useState(0)
  const [budget,         setBudget]         = useState<Budget | null>(null)
  const [budgetLoading,  setBudgetLoading]  = useState(true)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)

  // Computed once on the CLIENT — never on the server
  const [month]     = useState<string>(toMonthParam)
  const [monthName] = useState<string>(monthLabel)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      api.analytics.summary(month),
      api.transactions.list({ month, limit: 5 }),
    ])
      .then(([s, txs]) => {
        setSummary(s)
        setTransactions(txs)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [month])

  const fetchBudget = useCallback(() => {
    setBudgetLoading(true)
    api.budget.get()
      .then(setBudget)
      .catch(() => setBudget(null))
      .finally(() => setBudgetLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchBudget() }, [fetchBudget])

  // ── Refresh when QuickAdd saves a transaction ─────────────────────────────────
  const { txSavedAt } = useQuickAdd()
  useEffect(() => {
    if (txSavedAt === 0) return   // skip initial mount
    fetchData()
  }, [txSavedAt, fetchData])

  // ── Undo delete ───────────────────────────────────────────────────────────────
  const { pendingTx, scheduleDelete, undo } = useUndoDelete({
    onConfirm: (id) => {
      api.transactions.delete(id).catch((err) => {
        console.error('[Dashboard] Delete failed:', err)
        fetchData()
      })
      // Refresh summary after confirmed delete
      api.analytics.summary(month).then(setSummary).catch(() => null)
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
      setTransactions((prev) =>
        [...prev, tx].sort((a, b) =>
          a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1,
        ).slice(0, 5),
      )
    }
  }

  // ── Edit saved ────────────────────────────────────────────────────────────────
  function handleSaved(updated: Transaction) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    )
  }

  const balance      = summary?.balance       ?? 0
  const isNegative   = balance < 0

  return (
    <>
      <Header
        title="Vault"
        subtitle={monthName}
        right={
          <button
            aria-label="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-full text-label-secondary active:bg-surface-overlay transition-colors"
          >
            <Settings size={18} strokeWidth={1.8} aria-hidden />
          </button>
        }
      />

      <PageShell className="space-y-4 animate-fade-up">

        {/* ── Budget card ──────────────────────────────────────────────── */}
        <BudgetCard
          budget={budget}
          totalExpense={summary?.total_expense ?? 0}
          month={month}
          loading={budgetLoading}
          onEdit={() => setBudgetSheetOpen(true)}
        />

        {/* ── Balance card ─────────────────────────────────────────────── */}
        {loading ? (
          <BalanceSkeleton />
        ) : error ? (
          <ErrorCard message={error} onRetry={fetchData} />
        ) : (
          <Card className={cn(
            'bg-gradient-to-br transition-colors duration-500',
            isNegative
              ? 'from-[#2A1010] to-[#1E0A0A]'   // dark red tint when in the red
              : 'from-surface to-surface-elevated',
          )}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] font-semibold text-label-tertiary uppercase tracking-widest">
                Total Balance
              </p>
              {isNegative && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-expense/80 bg-expense/10 px-2 py-0.5 rounded-full">
                  <TrendingDown size={10} aria-hidden />
                  Over budget
                </span>
              )}
            </div>

            <AnimatedNumber
              value={balance}
              format={(n) => (n < 0 ? `−${formatINR(Math.abs(n))}` : formatINR(n))}
              className={cn(
                'text-display-lg block',
                isNegative ? 'text-expense' : 'text-label-primary',
              )}
            />

            <div className="flex gap-3 mt-5 pt-4 border-t border-border">
              <SummaryPill
                label="Income"
                amount={summary?.total_income  ?? 0}
                variant="income"
              />
              <SummaryPill
                label="Spent"
                amount={summary?.total_expense ?? 0}
                variant="expense"
              />
            </div>
          </Card>
        )}

        {/* ── Quick entries ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[15px] font-semibold text-label-primary">Quick Entries</h2>
          </div>
          <QuickEntryRow
            onTransactionLogged={fetchData}
            onAddNew={() => setPinSheetOpen(true)}
            refreshKey={pinRefreshKey}
          />
        </section>

        {/* ── Recent transactions ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-label-primary">
              Recent
            </h2>
            <button className="text-[13px] text-accent-light font-medium tap-target">
              See all
            </button>
          </div>

          {loading ? (
            <TransactionListSkeleton />
          ) : transactions.length === 0 ? (
            <EmptyTransactions />
          ) : (
            <Card flush>
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <SwipeableRow
                    tx={tx}
                    onDelete={handleDelete}
                    onEdit={setEditingTx}
                  />
                  {i < transactions.length - 1 && (
                    <div className="mx-4 border-t border-border" />
                  )}
                </div>
              ))}
            </Card>
          )}
        </section>

      </PageShell>

      {/* ── Edit sheet (portal-like, outside scroll area) ─────────────── */}
      <EditTransactionSheet
        tx={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={handleSaved}
      />

      {/* ── Pin entry sheet ───────────────────────────────────────────── */}
      <PinEntrySheet
        isOpen={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        onSaved={() => setPinRefreshKey((k) => k + 1)}
      />

      {/* ── Budget setup sheet ───────────────────────────────────────── */}
      <BudgetSetupSheet
        isOpen={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        existing={budget}
        onSaved={(b) => setBudget(b)}
        onDeleted={() => setBudget(null)}
      />

      {/* ── Undo delete toast ─────────────────────────────────────────── */}
      <UndoToast tx={pendingTx} onUndo={handleUndo} />
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryPill({
  label, amount, variant,
}: {
  label:   string
  amount:  number
  variant: 'income' | 'expense'
}) {
  return (
    <div className="flex-1">
      <Badge variant={variant} className="mb-1.5">{label}</Badge>
      <AnimatedNumber
        value={amount}
        format={formatINR}
        className={cn(
          'text-[18px] font-bold',
          variant === 'income' ? 'text-income' : 'text-expense',
        )}
      />
    </div>
  )
}

function EmptyTransactions() {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4 select-none" aria-hidden>💸</div>
      <p className="text-[15px] font-semibold text-label-primary mb-1">
        No transactions yet
      </p>
      <p className="text-[13px] text-label-secondary max-w-[200px] leading-relaxed">
        Tap <strong className="text-label-primary">+</strong> below to add your first entry.
      </p>
    </Card>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="text-center py-8">
      <p className="text-expense text-[14px] font-medium mb-1">Could not load data</p>
      <p className="text-label-tertiary text-[12px] mb-4 font-mono">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-[13px] text-accent-light font-medium"
      >
        <RefreshCw size={13} aria-hidden /> Retry
      </button>
    </Card>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function BalanceSkeleton() {
  return (
    <Card>
      <div className="h-2.5 w-24 shimmer rounded-full mb-3" />
      <div className="h-10 w-44 shimmer rounded-xl mb-5" />
      <div className="flex gap-3 pt-4 border-t border-border">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-14 shimmer rounded-full" />
          <div className="h-6 w-20 shimmer rounded-lg" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-14 shimmer rounded-full" />
          <div className="h-6 w-20 shimmer rounded-lg" />
        </div>
      </div>
    </Card>
  )
}

function TransactionListSkeleton() {
  return (
    <Card flush>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-2xl shimmer flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 shimmer rounded-full" />
            <div className="h-2.5 w-16 shimmer rounded-full" />
          </div>
          <div className="h-4 w-14 shimmer rounded-full" />
        </div>
      ))}
    </Card>
  )
}
