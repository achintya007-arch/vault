'use client'

import { cn } from '@/lib/utils'
import type { Category } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryGridProps {
  categories: Category[]
  selected:   number | null
  loading:    boolean
  onSelect:   (id: number) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryGrid({
  categories,
  selected,
  loading,
  onSelect,
}: CategoryGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2 px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCell key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2 px-4">
      {categories.map((cat) => (
        <CategoryCell
          key={cat.id}
          category={cat}
          selected={selected === cat.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// ── Category cell ─────────────────────────────────────────────────────────────

function CategoryCell({
  category,
  selected,
  onSelect,
}: {
  category: Category
  selected: boolean
  onSelect: (id: number) => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        onSelect(category.id)
      }}
      aria-label={category.name}
      aria-pressed={selected}
      className={cn(
        // Base
        'flex flex-col items-center justify-center gap-1.5',
        'py-3 px-1 rounded-2xl',
        'transition-all duration-150 select-none touch-manipulation',
        // States
        selected
          ? 'bg-accent/20 ring-1 ring-accent/40 scale-[1.03]'
          : 'bg-surface-elevated active:scale-95 active:bg-surface-overlay',
      )}
    >
      {/* Emoji icon */}
      <span
        className="text-2xl leading-none"
        style={{ filter: selected ? 'none' : 'grayscale(20%)' }}
        aria-hidden
      >
        {category.icon}
      </span>

      {/* Label */}
      <span
        className={cn(
          'text-[9.5px] font-semibold text-center leading-tight',
          'w-full truncate px-0.5',
          selected ? 'text-accent-light' : 'text-label-secondary',
        )}
      >
        {category.name}
      </span>
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCell() {
  return (
    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl bg-surface-elevated animate-pulse">
      <div className="w-6 h-6 rounded-full bg-surface-overlay" />
      <div className="w-10 h-2 rounded bg-surface-overlay" />
    </div>
  )
}
