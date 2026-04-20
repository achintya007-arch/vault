'use client'

import { useState, useEffect, useRef } from 'react'
import { api, type Transaction } from '@/lib/api'

// ── Module-level cache ─────────────────────────────────────────────────────────
// Persists for the browser session. Cleared after each new save so chips stay
// fresh without needing a full re-fetch on every sheet open.

let recentCache: Transaction[] | null = null

export function invalidateRecentEntryCache(): void {
  recentCache = null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the last 5 unique (category_id, amount) combos across all recorded
 * transactions, most recent first. Used as "Recent" chips in QuickAddSheet.
 *
 * Fetches once on mount (or after cache invalidation), then reads from the
 * module-level cache — zero extra requests on subsequent sheet opens.
 */
export function useRecentEntries(): Transaction[] {
  const [entries, setEntries] = useState<Transaction[]>(recentCache ?? [])
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    // Cache hit — no fetch needed
    if (recentCache !== null) {
      setEntries(recentCache)
      return
    }

    // Fetch recent transactions (no month filter — we want historical patterns)
    api.transactions
      .list({ limit: 40 })
      .then((txs) => {
        if (!mounted.current) return

        // Deduplicate: keep the first occurrence of each (category_id, amount) pair.
        // Since the API returns newest-first, first = most recent.
        const seen = new Set<string>()
        const deduped = txs.filter((tx) => {
          const k = `${tx.category_id}:${tx.amount}`
          if (seen.has(k)) return false
          seen.add(k)
          return true
        }).slice(0, 5)

        recentCache = deduped
        setEntries(deduped)
      })
      .catch(() => {}) // silent — recent chips are a nice-to-have
  }, [])

  return entries
}
