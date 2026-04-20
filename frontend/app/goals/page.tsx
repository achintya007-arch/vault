import type { Metadata } from 'next'
import { Header }    from '@/components/layout/Header'
import { PageShell } from '@/components/layout/PageShell'
import { Card }      from '@/components/ui/Card'

export const metadata: Metadata = { title: 'Goals' }

export default function GoalsPage() {
  return (
    <>
      <Header title="Goals" />

      <PageShell className="space-y-4 animate-fade-up">

        {/* Active goals list — wired to /goals API in Days 9-10 */}
        <EmptyState />

      </PageShell>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4 select-none" aria-hidden>🎯</div>
      <p className="text-[15px] font-semibold text-label-primary mb-1">
        No goals yet
      </p>
      <p className="text-[13px] text-label-secondary max-w-[220px] leading-relaxed">
        Create a savings goal and track your progress here.
      </p>
      <button className="mt-5 px-5 py-2 rounded-full bg-accent text-white text-[13px] font-semibold active:scale-95 transition-transform">
        Create goal
      </button>
    </Card>
  )
}
