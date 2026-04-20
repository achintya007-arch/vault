'use client'

import { useState, useEffect } from 'react'
import { api, type Category } from '@/lib/api'

// Simple module-level cache — persists for the lifetime of the browser session
// without needing IndexedDB or SWR. Replaced by a proper cache in Day 5.
const memCache: Partial<Record<'income' | 'expense', Category[]>> = {}

export function useCategories(kind: 'income' | 'expense') {
  const [categories, setCategories] = useState<Category[]>(
    memCache[kind] ?? [],
  )
  const [loading, setLoading] = useState<boolean>(!memCache[kind])
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // Already cached — nothing to do
    if (memCache[kind]) {
      setCategories(memCache[kind]!)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    api.categories
      .list(kind)
      .then((data) => {
        if (cancelled) return
        memCache[kind] = data
        setCategories(data)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [kind])

  return { categories, loading, error }
}
