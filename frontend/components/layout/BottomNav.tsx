'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Target, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickAdd } from '@/context/QuickAddContext'

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  {
    href:  '/',
    label: 'Dashboard',
    icon:  LayoutDashboard,
    // Exact match — /goals should not highlight Dashboard
    exact: true,
  },
  {
    href:  '/goals',
    label: 'Goals',
    icon:  Target,
    exact: false,
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export function BottomNav() {
  const pathname = usePathname()
  const { isOpen, open } = useQuickAdd()

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 inset-x-0 z-50',
        'glass border-t border-border',
        // Push content above the physical home indicator on iPhone
        'pb-safe',
      )}
    >
      <div className="flex items-center justify-around h-[60px] px-4 max-w-lg mx-auto">

        {/* Dashboard tab */}
        <NavTab
          href={TABS[0].href}
          label={TABS[0].label}
          icon={TABS[0].icon}
          active={isActive(TABS[0].href, TABS[0].exact)}
        />

        {/* Centre Add button */}
        <AddButton isSheetOpen={isOpen} onPress={open} />

        {/* Goals tab */}
        <NavTab
          href={TABS[1].href}
          label={TABS[1].label}
          icon={TABS[1].icon}
          active={isActive(TABS[1].href, TABS[1].exact)}
        />

      </div>
    </nav>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

type NavTabProps = {
  href:   string
  label:  string
  icon:   React.ElementType
  active: boolean
}

function NavTab({ href, label, icon: Icon, active }: NavTabProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 flex-1 py-1 tap-target',
        'transition-colors duration-150',
        active ? 'text-accent-light' : 'text-label-tertiary',
      )}
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.2 : 1.8}
        aria-hidden
      />
      <span className={cn(
        'text-[10px] font-medium tracking-wide',
        active ? 'text-accent-light' : 'text-label-tertiary',
      )}>
        {label}
      </span>
    </Link>
  )
}

function AddButton({
  isSheetOpen,
  onPress,
}: {
  isSheetOpen: boolean
  onPress: () => void
}) {
  return (
    <button
      aria-label={isSheetOpen ? 'Close quick add' : 'Add transaction'}
      aria-expanded={isSheetOpen}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className={cn(
        'flex items-center justify-center',
        'w-12 h-12 rounded-full',
        'shadow-lg transition-all duration-200',
        // Lift above the nav bar
        '-mt-5',
        isSheetOpen
          ? 'bg-white/15 shadow-none scale-90'
          : 'bg-accent shadow-accent/35 active:scale-90',
      )}
    >
      <Plus
        size={22}
        strokeWidth={2.5}
        aria-hidden
        className={cn(
          'text-white transition-transform duration-300',
          isSheetOpen && 'rotate-45',
        )}
      />
    </button>
  )
}
