import { cn } from '@/lib/utils'

type CardProps = {
  children:   React.ReactNode
  className?: string
  /** Elevated variant sits one step higher in the surface stack */
  elevated?:  boolean
  /** Remove default padding */
  flush?:     boolean
  onClick?:   React.MouseEventHandler<HTMLDivElement>
}

export function Card({ children, className, elevated, flush, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-3xl card-border',
        elevated ? 'bg-surface-elevated' : 'bg-surface',
        !flush && 'p-4',
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform duration-100',
        className,
      )}
    >
      {children}
    </div>
  )
}
