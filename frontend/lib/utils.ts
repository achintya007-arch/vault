import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely (handles conflicts like p-2 + p-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Indian Rupee. */
export function formatINR(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-IN', {
      style:           'currency',
      currency:        'INR',
      notation:        'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Month names — environment-independent, no locale/ICU dependency
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

/**
 * Return "April 2026" style label.
 * Uses a static array instead of toLocaleDateString('en-IN') which is
 * unreliable across Node.js builds that lack full ICU data.
 * Always call on the CLIENT so the user's local timezone is used.
 */
export function monthLabel(d: Date = new Date()): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Return "YYYY-MM" string suitable for API ?month= params.
 * Always call on the CLIENT — new Date() on the server uses UTC,
 * which can produce the wrong month for users in UTC+ timezones.
 */
export function toMonthParam(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Shift a YYYY-MM param by `delta` months (+1 = next, -1 = previous).
 * Safe across year boundaries.
 */
export function shiftMonth(param: string, delta: number): string {
  const [year, mon] = param.split('-').map(Number)
  const d = new Date(year, mon - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Convert a YYYY-MM API param back to a human label ("April 2026").
 */
export function monthLabelFromParam(param: string): string {
  const [year, mon] = param.split('-').map(Number)
  return `${MONTHS[mon - 1]} ${year}`
}

/**
 * Format a transaction date string (YYYY-MM-DD) as a human label.
 * Appends T00:00:00 before parsing to force LOCAL midnight interpretation —
 * bare YYYY-MM-DD is parsed as UTC midnight by the JS spec, which shifts
 * the displayed date by one day for users in UTC+ timezones.
 */
export function formatTxDate(dateStr: string): string {
  const d       = new Date(`${dateStr}T00:00:00`)
  const today   = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()

  if (sameDay(d, today))     return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'

  // "Apr 20" for same year, "Apr 20, 2025" across years
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === today.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }

  return d.toLocaleDateString('en', opts)
}
