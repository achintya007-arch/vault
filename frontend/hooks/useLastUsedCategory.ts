'use client'

// ── Storage keys ──────────────────────────────────────────────────────────────

function storageKey(kind: 'income' | 'expense'): string {
  return `vault:lastCategory:${kind}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Persists the last-used category id per transaction kind to localStorage.
 *
 * Usage:
 *   const { getLastUsed, saveLastUsed } = useLastUsedCategory('expense')
 *   const defaultId = getLastUsed()   // number | null
 *   saveLastUsed(categoryId)          // call when user picks a category
 */
export function useLastUsedCategory(kind: 'income' | 'expense') {
  function getLastUsed(): number | null {
    try {
      const raw = localStorage.getItem(storageKey(kind))
      if (!raw) return null
      const n = parseInt(raw, 10)
      return isNaN(n) ? null : n
    } catch {
      return null
    }
  }

  function saveLastUsed(id: number): void {
    try {
      localStorage.setItem(storageKey(kind), String(id))
    } catch {
      // localStorage unavailable (SSR, private browsing quota) — silent fail
    }
  }

  return { getLastUsed, saveLastUsed }
}

// ── Standalone helpers (for use outside React) ────────────────────────────────

export function readLastUsedCategory(kind: 'income' | 'expense'): number | null {
  try {
    const raw = localStorage.getItem(storageKey(kind))
    if (!raw) return null
    const n = parseInt(raw, 10)
    return isNaN(n) ? null : n
  } catch {
    return null
  }
}

export function writeLastUsedCategory(kind: 'income' | 'expense', id: number): void {
  try {
    localStorage.setItem(storageKey(kind), String(id))
  } catch {}
}
