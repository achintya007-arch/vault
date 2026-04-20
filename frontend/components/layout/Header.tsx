import { cn } from '@/lib/utils'

type HeaderProps = {
  title:       string
  subtitle?:   string
  left?:       React.ReactNode   // back button, avatar, etc.
  right?:      React.ReactNode   // settings icon, filter, etc.
  className?:  string
}

export function Header({ title, subtitle, left, right, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'px-5 pt-safe-offset pb-3',
        className,
      )}
    >
      {/* Left slot */}
      <div className="w-8 flex-shrink-0">
        {left ?? null}
      </div>

      {/* Centre title */}
      <div className="flex flex-col items-center">
        <h1 className="text-[17px] font-semibold text-label-primary tracking-tight leading-snug">
          {title}
        </h1>
        {subtitle && (
          <span className="text-[12px] text-label-secondary mt-0.5">
            {subtitle}
          </span>
        )}
      </div>

      {/* Right slot */}
      <div className="w-8 flex-shrink-0 flex justify-end">
        {right ?? null}
      </div>
    </header>
  )
}
