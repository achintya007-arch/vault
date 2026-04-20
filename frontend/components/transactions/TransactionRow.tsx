import { cn, formatINR, formatTxDate } from '@/lib/utils'
import type { Transaction } from '@/lib/api'

interface TransactionRowProps {
  tx:         Transaction
  className?: string
}

export function TransactionRow({ tx, className }: TransactionRowProps) {
  const isExpense = tx.kind === 'expense'

  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl leading-none select-none"
        style={{ background: `${tx.category.color}22` }}
        aria-hidden
      >
        {tx.category.icon}
      </div>

      {/* Label + date */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-label-primary truncate leading-snug">
          {tx.note?.trim() || tx.category.name}
        </p>
        <p className="text-[11.5px] text-label-tertiary mt-0.5">
          {tx.note?.trim()
            ? `${tx.category.name} · ${formatTxDate(tx.date)}`
            : formatTxDate(tx.date)}
        </p>
      </div>

      {/* Amount */}
      <p
        className={cn(
          'text-[14px] font-semibold tabular-nums flex-shrink-0',
          isExpense ? 'text-expense' : 'text-income',
        )}
      >
        {isExpense ? '−' : '+'}{formatINR(tx.amount)}
      </p>
    </div>
  )
}
