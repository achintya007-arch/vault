'use client'

// ── Storage ───────────────────────────────────────────────────────────────────

function key(categoryId: number): string {
  return `vault:lastAmount:${categoryId}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Read the last amount used for a given category.
 * Returns null if nothing stored or value is invalid.
 */
export function readLastUsedAmount(categoryId: number): number | null {
  try {
    const raw = localStorage.getItem(key(categoryId))
    if (!raw) return null
    const n = parseFloat(raw)
    return isNaN(n) || n <= 0 ? null : n
  } catch {
    return null
  }
}

/**
 * Persist the amount used for a category so it can be pre-filled next time.
 */
export function writeLastUsedAmount(categoryId: number, amount: number): void {
  try {
    if (amount > 0) localStorage.setItem(key(categoryId), String(amount))
  } catch {}
}
