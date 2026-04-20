'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { TransactionRow } from './TransactionRow'
import type { Transaction } from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const DELETE_THRESHOLD = 90   // px — how far to swipe before triggering delete
const LOCK_THRESHOLD   = 5    // px — movement before we decide axis

// ── Props ─────────────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  tx:        Transaction
  onDelete:  (id: number) => void
  onEdit:    (tx: Transaction) => void
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SwipeableRow({ tx, onDelete, onEdit, className }: SwipeableRowProps) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const innerRef   = useRef<HTMLDivElement>(null)
  const swipedRef  = useRef(false)          // true if this touch was a swipe
  const deletingRef = useRef(false)         // prevent double-trigger

  // translateX of the inner row (negative = swiped left)
  const [offset,   setOffset]   = useState(0)
  // true while running exit animation
  const [exiting,  setExiting]  = useState(false)
  // opacity of the trash background
  const trashOpacity = Math.min(Math.abs(offset) / DELETE_THRESHOLD, 1)

  useEffect(() => {
    const wrap  = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return

    let startX         = 0
    let startY         = 0
    let currentX       = 0
    let direction: 'h' | 'v' | null = null
    let crossedThreshold = false   // fires haptic exactly once per swipe

    function onTouchStart(e: TouchEvent) {
      if (deletingRef.current) return
      const t      = e.touches[0]
      startX       = t.clientX
      startY       = t.clientY
      currentX     = 0
      direction    = null
      crossedThreshold  = false
      swipedRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (deletingRef.current) return
      const t  = e.touches[0]
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      // Lock direction after LOCK_THRESHOLD
      if (direction === null) {
        if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return
        direction = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }

      if (direction === 'v') return

      // We're in horizontal mode — prevent vertical scroll
      e.preventDefault()

      // Only allow left swipe (negative dx)
      currentX = Math.min(0, dx)
      setOffset(currentX)

      if (Math.abs(currentX) > 8) {
        swipedRef.current = true
      }

      // Single haptic pulse when crossing the delete threshold
      if (!crossedThreshold && Math.abs(currentX) >= DELETE_THRESHOLD) {
        crossedThreshold = true
        navigator.vibrate?.(12)
      }
      // Reset flag if user pulls back below threshold
      if (crossedThreshold && Math.abs(currentX) < DELETE_THRESHOLD) {
        crossedThreshold = false
      }
    }

    function onTouchEnd() {
      if (deletingRef.current) return
      if (direction !== 'h') return

      if (Math.abs(currentX) >= DELETE_THRESHOLD) {
        triggerDelete()
      } else {
        // Snap back
        setOffset(0)
      }
      direction = null
    }

    wrap.addEventListener('touchstart', onTouchStart, { passive: true })
    wrap.addEventListener('touchmove',  onTouchMove,  { passive: false })
    wrap.addEventListener('touchend',   onTouchEnd,   { passive: true })
    wrap.addEventListener('touchcancel',onTouchEnd,   { passive: true })

    return () => {
      wrap.removeEventListener('touchstart', onTouchStart)
      wrap.removeEventListener('touchmove',  onTouchMove)
      wrap.removeEventListener('touchend',   onTouchEnd)
      wrap.removeEventListener('touchcancel',onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.id])

  function triggerDelete() {
    if (deletingRef.current) return
    deletingRef.current = true
    setExiting(true)

    // Phase 1: slide row out (220ms)
    setOffset(-window.innerWidth)

    // Phase 2: collapse height (starts at 220ms, lasts 280ms)
    setTimeout(() => {
      const wrap = wrapRef.current
      if (wrap) {
        wrap.style.maxHeight  = `${wrap.offsetHeight}px`
        wrap.style.overflow   = 'hidden'
        // Force reflow so the transition starts from the measured value
        void wrap.offsetHeight
        wrap.style.transition = 'max-height 280ms cubic-bezier(0.4,0,0.2,1)'
        wrap.style.maxHeight  = '0'
      }

      setTimeout(() => onDelete(tx.id), 290)
    }, 220)
  }

  function handleClick() {
    if (swipedRef.current) return
    onEdit(tx)
  }

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Trash background — revealed as row slides left */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1.5rem',
          background: `rgba(239,68,68,${trashOpacity * 0.9})`,
          borderRadius: 'inherit',
          transition: exiting ? 'none' : undefined,
        }}
      >
        <Trash2
          size={20}
          className="text-white"
          style={{ opacity: trashOpacity }}
        />
      </div>

      {/* Sliding row */}
      <div
        ref={innerRef}
        onClick={handleClick}
        style={{
          transform: `translateX(${offset}px)`,
          transition: exiting
            ? 'transform 220ms cubic-bezier(0.4,0,0.2,1)'
            : offset === 0
            ? 'transform 320ms cubic-bezier(0.16,1,0.3,1)'
            : 'none',
          cursor: 'pointer',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <TransactionRow tx={tx} className="px-4" />
      </div>
    </div>
  )
}
