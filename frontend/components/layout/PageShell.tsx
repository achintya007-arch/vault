import { cn } from '@/lib/utils'

type PageShellProps = {
  children:   React.ReactNode
  className?: string
  /** Remove default horizontal padding (e.g. for full-bleed sections) */
  flush?:     boolean
}

/**
 * Wraps every page with consistent horizontal padding and max-width.
 * The bottom padding for the fixed nav is handled by the root layout.
 */
export function PageShell({ children, className, flush }: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-lg',
        !flush && 'px-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
