import { cn } from '@/lib/utils'

type BadgeVariant = 'income' | 'expense' | 'neutral' | 'accent'

type BadgeProps = {
  children:   React.ReactNode
  variant?:   BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  income:  'bg-income/10  text-income',
  expense: 'bg-expense/10 text-expense',
  neutral: 'bg-surface-elevated text-label-secondary',
  accent:  'bg-accent/15  text-accent-light',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'px-2.5 py-0.5 rounded-full',
        'text-[11px] font-semibold tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
