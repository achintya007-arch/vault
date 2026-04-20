'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickAddContextValue {
  isOpen:   boolean
  open:     () => void
  close:    () => void
  /**
   * Monotonic timestamp (Date.now()) set each time a transaction is
   * successfully saved. Views that display transaction data should
   * re-fetch whenever this value changes from a non-zero baseline.
   */
  txSavedAt: number
  /**
   * Call this from QuickAddSheet after a successful save so that any
   * mounted view can react and refresh its data.
   */
  notifyTransactionSaved: () => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const QuickAddContext = createContext<QuickAddContextValue>({
  isOpen:    false,
  open:      () => {},
  close:     () => {},
  txSavedAt: 0,
  notifyTransactionSaved: () => {},
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen,    setIsOpen]    = useState(false)
  const [txSavedAt, setTxSavedAt] = useState(0)

  const open  = useCallback(() => setIsOpen(true),  [])
  const close = useCallback(() => setIsOpen(false), [])
  const notifyTransactionSaved = useCallback(() => setTxSavedAt(Date.now()), [])

  return (
    <QuickAddContext.Provider value={{ isOpen, open, close, txSavedAt, notifyTransactionSaved }}>
      {children}
    </QuickAddContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQuickAdd() {
  return useContext(QuickAddContext)
}
