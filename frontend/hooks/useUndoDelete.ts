'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Transaction } from '@/lib/api'

interface UseUndoDeleteOptions {
  /** Called after the grace period expires — perform the real API delete here. */
  onConfirm: (id: number) => void
  /** Grace period in ms. Default 5000. */
  delay?: number
}

interface UseUndoDeleteReturn {
  /** Transaction currently pending deletion (null = no pending delete). */
  pendingTx: Transaction | null
  /** Call when user swipes to delete. Starts the countdown. */
  scheduleDelete: (tx: Transaction) => void
  /** Call when user taps "Undo". Returns the restored transaction. */
  undo: () => Transaction | null
}

export function useUndoDelete({
  onConfirm,
  delay = 5000,
}: UseUndoDeleteOptions): UseUndoDeleteReturn {
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null)

  // Keep a ref to the current pendingTx so closures inside setTimeout
  // can access the latest value without re-creating the timer.
  const pendingRef = useRef<Transaction | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const scheduleDelete = useCallback((tx: Transaction) => {
    // If there's already a pending delete, confirm it immediately before
    // starting the new one — prevents two pending deletes at once.
    if (pendingRef.current !== null) {
      clearTimer()
      onConfirm(pendingRef.current.id)
    }

    pendingRef.current = tx
    setPendingTx(tx)

    timerRef.current = setTimeout(() => {
      pendingRef.current = null
      setPendingTx(null)
      timerRef.current  = null
      onConfirm(tx.id)
    }, delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay])

  const undo = useCallback((): Transaction | null => {
    clearTimer()
    const tx = pendingRef.current
    pendingRef.current = null
    setPendingTx(null)
    return tx
  }, [])

  // On unmount, confirm any still-pending delete immediately.
  useEffect(() => {
    return () => {
      clearTimer()
      if (pendingRef.current !== null) {
        onConfirm(pendingRef.current.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { pendingTx, scheduleDelete, undo }
}
