import type { KeypadKey } from '@/components/forms/Keypad'

// ── Pure helpers shared by QuickAddSheet + EditTransactionSheet ────────────────

/**
 * Apply a keypad key press to the current raw amount string.
 * Rules:
 *  - Max 8 digits before decimal point
 *  - Max 2 digits after decimal point
 *  - Leading zero replaced on first non-zero digit
 *  - Backspace collapses to '0' when empty
 */
export function applyKey(raw: string, key: KeypadKey): string {
  if (key === '⌫') {
    const next = raw.slice(0, -1)
    return next === '' || next === '-' ? '0' : next
  }
  if (key === '.') {
    if (raw.includes('.')) return raw
    return raw === '0' ? '0.' : raw + '.'
  }
  // Digit
  const [intPart, decPart] = raw.split('.')
  if (decPart !== undefined && decPart.length >= 2) return raw
  if (decPart === undefined && intPart.replace(/^0/, '').length >= 8) return raw
  if (raw === '0') return key
  return raw + key
}

/**
 * Convert a raw amount string to the live formatted display (₹1,23,456.50).
 */
export function formatDisplay(raw: string): string {
  if (raw === '0' || raw === '') return '₹0'

  const [intStr, decStr] = raw.split('.')
  const intNum = parseInt(intStr, 10) || 0
  const formatted = new Intl.NumberFormat('en-IN').format(intNum)

  return decStr !== undefined ? `₹${formatted}.${decStr}` : `₹${formatted}`
}

/**
 * Convert a raw amount string to a float for API submission.
 */
export function parseAmount(raw: string): number {
  return parseFloat(raw) || 0
}

/**
 * Convert a numeric amount back to a raw keypad string.
 * e.g. 60 → "60", 12.5 → "12.5", 12.50 → "12.5"
 */
export function toRawString(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/\.?0+$/, '')
}
