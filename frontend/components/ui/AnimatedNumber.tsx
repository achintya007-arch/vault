'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// ── Easing ────────────────────────────────────────────────────────────────────

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AnimatedNumberProps {
  /** Target value. When this changes the number animates. */
  value:      number
  /** Converts the intermediate numeric value to the displayed string. */
  format:     (n: number) => string
  /** Animation duration in ms. Default 650. */
  duration?:  number
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnimatedNumber({
  value,
  format,
  duration = 650,
  className,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value)

  // Track the value we started from so we can interpolate correctly
  const fromRef    = useRef(value)
  const rafRef     = useRef<number | undefined>(undefined)
  const startRef   = useRef<number | undefined>(undefined)

  useEffect(() => {
    // No animation needed if the target hasn't changed
    if (fromRef.current === value) return

    const from = fromRef.current
    fromRef.current = value

    // Cancel any in-progress animation
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    startRef.current = undefined

    function tick(now: number) {
      if (startRef.current === undefined) startRef.current = now

      const elapsed  = now - startRef.current
      const t        = Math.min(elapsed / duration, 1)
      const eased    = easeOutQuart(t)
      const current  = from + (value - from) * eased

      setDisplayed(current)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Snap to exact target at the end
        setDisplayed(value)
        rafRef.current = undefined
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return (
    <span className={cn('tabular-nums', className)}>
      {format(displayed)}
    </span>
  )
}
