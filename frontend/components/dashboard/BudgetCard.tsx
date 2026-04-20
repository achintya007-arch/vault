'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Pencil, Target, AlertTriangle,
  ArrowDownRight, ArrowUpRight, Minus,
  Zap, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { cn, formatINR, toMonthParam } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { api, type Budget, type BudgetInsights } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type BudgetStatus = 'good' | 'caution' | 'warning' | 'danger' | 'over'
type PaceStatus   = 'under' | 'on-track' | 'over-pace' | 'critical'

interface KPIs {
  budgetLeft:      number
  overspendBy:     number
  pctUsed:         number
  daysRemaining:   number
  daysInMonth:     number
  safeDailySpend:  number
  targetDailySpend: number   // monthly_limit / daysInMonth — the "perfect" daily rate
  status:          BudgetStatus
  timeElapsedPct:  number
}

// ── Status helpers ────────────────────────────────────────────────────────────

function getBudgetStatus(pctUsed: number, timeElapsedPct: number): BudgetStatus {
  if (pctUsed >= 100) return 'over'
  if (pctUsed >= 90)  return 'danger'
  if (pctUsed >= 75)  return 'warning'
  if (pctUsed > timeElapsedPct + 15) return 'caution'
  return 'good'
}

function getPaceStatus(projected: number, limit: number): PaceStatus {
  const ratio = projected / limit
  if (ratio <= 0.85) return 'under'
  if (ratio <= 1.05) return 'on-track'
  if (ratio <= 1.35) return 'over-pace'
  return 'critical'
}

/**
 * Pick the best projection to show.
 * Prefer the weekday/weekend model once we have at least 2 days of each type.
 * Fall back to linear otherwise — the wk model is unreliable with only 1 data point per bucket.
 */
function pickProjection(ins: BudgetInsights): number {
  const hasWkData = ins.weekdays_elapsed >= 2 && ins.weekend_days_elapsed >= 1
  const hasThourough = ins.weekdays_elapsed >= 1 && ins.weekend_days_elapsed >= 2
  return (hasWkData || hasThourough) ? ins.projected_spend_wk : ins.projected_spend
}

// ── Color maps ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BudgetStatus, string> = {
  good:    '#34D399',
  caution: '#FBBF24',
  warning: '#F97316',
  danger:  '#F87171',
  over:    '#F87171',
}

const STATUS_BG: Record<BudgetStatus, string> = {
  good:    'rgba(52,211,153,0.07)',
  caution: 'rgba(251,191,36,0.08)',
  warning: 'rgba(249,115,22,0.09)',
  danger:  'rgba(248,113,113,0.10)',
  over:    'rgba(248,113,113,0.13)',
}

const PACE_META: Record<PaceStatus, {
  label: string
  color: string
  bg:    string
  Icon:  LucideIcon
}> = {
  'under':     { label: 'Under pace',  color: '#34D399', bg: 'rgba(52,211,153,0.15)',   Icon: ArrowDownRight },
  'on-track':  { label: 'On track',    color: '#34D399', bg: 'rgba(52,211,153,0.15)',   Icon: Minus          },
  'over-pace': { label: 'Over pace',   color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  Icon: ArrowUpRight   },
  'critical':  { label: 'Critical',    color: '#F87171', bg: 'rgba(248,113,113,0.17)', Icon: Zap            },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BudgetCardProps {
  budget:       Budget | null
  totalExpense: number
  month:        string        // YYYY-MM
  loading:      boolean
  onEdit:       () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BudgetCard({ budget, totalExpense, month, loading, onEdit }: BudgetCardProps) {
  if (loading) return <BudgetSkeleton />
  if (!budget)  return <BudgetCTA onSetup={onEdit} />
  return <BudgetKPI budget={budget} totalExpense={totalExpense} month={month} onEdit={onEdit} />
}

// ── Budget KPI card ───────────────────────────────────────────────────────────

function BudgetKPI({
  budget, totalExpense, month, onEdit,
}: {
  budget: Budget; totalExpense: number; month: string; onEdit: () => void
}) {
  // ── Core KPIs (synchronous) ───────────────────────────────────────────────
  const kpis = useMemo<KPIs>(() => {
    const [year, mon]    = month.split('-').map(Number)
    const daysInMonth    = new Date(year, mon, 0).getDate()
    const isCurrent      = toMonthParam() === month
    const today          = new Date()
    const dayOfMonth     = isCurrent ? today.getDate() : daysInMonth
    const daysRemaining  = isCurrent ? Math.max(1, daysInMonth - today.getDate() + 1) : 0

    const budgetLeft      = budget.monthly_limit - totalExpense
    const overspendBy     = Math.max(0, -budgetLeft)
    const pctUsed         = Math.min((totalExpense / budget.monthly_limit) * 100, 999)
    const timeElapsedPct  = (dayOfMonth / daysInMonth) * 100
    const safeDailySpend  = daysRemaining > 0 ? Math.max(0, budgetLeft / daysRemaining) : 0
    const targetDailySpend = budget.monthly_limit / daysInMonth
    const status          = getBudgetStatus(pctUsed, timeElapsedPct)

    return {
      budgetLeft, overspendBy, pctUsed,
      daysRemaining, daysInMonth,
      safeDailySpend, targetDailySpend,
      status, timeElapsedPct,
    }
  }, [budget, totalExpense, month])

  // ── Insights (async) ─────────────────────────────────────────────────────
  const [insights,        setInsights]        = useState<BudgetInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    setInsightsLoading(true)
    api.analytics.budgetInsights(month)
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false))
  }, [month, totalExpense])   // re-fetch when new transactions land

  // ── Derived display values ────────────────────────────────────────────────
  const { budgetLeft, overspendBy, pctUsed, daysRemaining, safeDailySpend, targetDailySpend, status, timeElapsedPct } = kpis
  const isOver      = status === 'over'
  const accentColor = STATUS_COLOR[status]

  const barFillPct = Math.min(pctUsed, 100)
  const bgSizePct  = barFillPct > 0 ? (10000 / barFillPct).toFixed(1) : '100'
  // Clamp the tick so it never bleeds off the rounded ends of the bar
  const tickPct    = Math.min(Math.max(timeElapsedPct, 1), 98)

  // Projection
  const bestProjection = insights ? pickProjection(insights) : null
  const paceStatus     = bestProjection != null ? getPaceStatus(bestProjection, budget.monthly_limit) : null
  const paceMeta       = paceStatus ? PACE_META[paceStatus] : null

  return (
    <div
      className={cn(
        'rounded-3xl p-5 transition-colors duration-500',
        'border border-white/[0.06]',
      )}
      style={{ background: STATUS_BG[status] }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10.5px] font-semibold text-label-tertiary uppercase tracking-widest">
            Monthly Budget
          </p>
          <p className="text-[12px] text-label-secondary mt-0.5">
            {formatINR(budget.monthly_limit, true)} cap
          </p>
        </div>
        <button
          onClick={onEdit}
          aria-label="Edit budget"
          className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-label-secondary active:bg-white/15 transition-colors"
        >
          <Pencil size={13} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* ── Main metric ───────────────────────────────────────────────────── */}
      <div className="mb-4">
        {isOver ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(248,113,113,0.20)', color: '#F87171' }}
              >
                Over budget
              </span>
            </div>
            <span className="text-display-md font-bold" style={{ color: accentColor }}>
              <AnimatedNumber
                value={overspendBy}
                format={(n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))} over`}
              />
            </span>
          </>
        ) : (
          <>
            <span className="text-display-md font-bold" style={{ color: accentColor }}>
              <AnimatedNumber
                value={budgetLeft}
                format={(n) => formatINR(Math.max(0, n))}
              />
            </span>
            <p className="text-[12px] text-label-tertiary mt-0.5">remaining this month</p>
          </>
        )}
      </div>

      {/* ── Progress bar with time-elapsed tick ───────────────────────────── */}
      <div className="mb-3">
        <div className="relative h-[6px] rounded-full bg-white/[0.08] overflow-hidden">
          {/* Spend fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${barFillPct}%`,
              background: 'linear-gradient(to right, #34D399, #FBBF24, #F97316, #F87171)',
              backgroundSize: `${bgSizePct}% 100%`,
              transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
          {/* Time-elapsed tick: a vertical white notch that marks "where you should be" */}
          {daysRemaining > 0 && (
            <div
              aria-hidden
              className="absolute inset-y-0 w-[2px] bg-white/50 z-10"
              style={{
                left: `${tickPct}%`,
                transition: 'left 0.5s ease',
              }}
            />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
            {pctUsed.toFixed(0)}% used
          </span>
          <span className="text-[11px] text-label-tertiary">
            {daysRemaining > 0
              ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
              : 'Month ended'}
          </span>
        </div>
      </div>

      {/* ── Safe daily spend ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-xl px-3.5 py-2.5 mb-3"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {isOver ? (
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-expense flex-shrink-0" aria-hidden />
            <p className="text-[12px] font-medium text-expense/90">
              Exceeded your monthly limit
            </p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-label-secondary">Safe to spend</p>
            <p className="text-[13px] font-bold tabular-nums" style={{ color: accentColor }}>
              {formatINR(safeDailySpend, true)}/day
            </p>
          </>
        )}
      </div>

      {/* ── Insights strip ────────────────────────────────────────────────── */}
      {insightsLoading ? (
        <InsightsSkeleton />
      ) : insights && insights.elapsed_days > 0 ? (
        <InsightsStrip
          insights={insights}
          budget={budget}
          bestProjection={bestProjection!}
          paceStatus={paceStatus!}
          paceMeta={paceMeta!}
          targetDailySpend={targetDailySpend}
        />
      ) : null}
    </div>
  )
}

// ── Insights strip ────────────────────────────────────────────────────────────

function InsightsStrip({
  insights, budget, bestProjection, paceStatus, paceMeta, targetDailySpend,
}: {
  insights:          BudgetInsights
  budget:            Budget
  bestProjection:    number
  paceStatus:        PaceStatus
  paceMeta:          typeof PACE_META[PaceStatus]
  targetDailySpend:  number
}) {
  const { Icon } = paceMeta

  // Confidence: projection is unreliable in first 6 days
  const isEarlyEstimate   = insights.elapsed_days < 7
  // Weekday/weekend split is active when we have both types
  const hasSplitModel     = insights.weekdays_elapsed >= 2 && insights.weekend_days_elapsed >= 1
                         || insights.weekdays_elapsed >= 1 && insights.weekend_days_elapsed >= 2
  const modelNote = hasSplitModel ? 'wk/wknd model' : `${insights.elapsed_days}d avg`

  // Top category as % of total budget
  const topCatBudgetPct = insights.top_category
    ? Math.round((insights.top_category.total / budget.monthly_limit) * 100)
    : 0

  // Daily pace: ratio of actual avg to target daily rate
  const paceRatio       = targetDailySpend > 0 ? insights.daily_avg / targetDailySpend : 0
  const paceBarPct      = Math.min(paceRatio * 100, 200)   // cap visual at 2×
  const paceColor       = paceRatio <= 1.0  ? '#34D399'
                        : paceRatio <= 1.25 ? '#FBBF24'
                        : '#F87171'

  return (
    <>
      {/* Divider */}
      <div className="border-t border-white/[0.06] mb-3" />

      {/* ── Projection row ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-xl px-3.5 py-2.5 mb-2"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div>
          <p className="text-[10.5px] text-label-tertiary mb-0.5">Month-end projection</p>
          <p className="text-[14px] font-bold tabular-nums text-label-primary">
            {isEarlyEstimate && (
              <span className="text-label-tertiary mr-0.5">~</span>
            )}
            {formatINR(bestProjection, true)}
          </p>
          {/* Model confidence note */}
          <p className="text-[10px] text-label-tertiary mt-0.5 tabular-nums">
            {isEarlyEstimate ? 'early estimate · ' : ''}{modelNote}
          </p>
        </div>

        {/* Pace badge */}
        <div
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full flex-shrink-0"
          style={{ background: paceMeta.bg }}
        >
          <Icon size={11} style={{ color: paceMeta.color }} aria-hidden />
          <span className="text-[11px] font-semibold" style={{ color: paceMeta.color }}>
            {paceMeta.label}
          </span>
        </div>
      </div>

      {/* ── 2-col: top category + daily pace ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">

        {/* Top category */}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <p className="text-[10px] font-medium text-label-tertiary mb-1.5">Top category</p>
          {insights.top_category ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[13px] flex-shrink-0"
                style={{ background: `${insights.top_category.color}22` }}
                aria-hidden
              >
                {insights.top_category.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-label-primary truncate leading-tight">
                  {insights.top_category.category_name}
                </p>
                <p className="text-[10px] text-label-tertiary tabular-nums leading-tight mt-0.5">
                  {formatINR(insights.top_category.total, true)}
                  <span className="opacity-60"> · {topCatBudgetPct}%</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-label-tertiary">No expenses yet</p>
          )}
        </div>

        {/* Daily pace: actual avg vs target */}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp size={9} className="text-label-tertiary" aria-hidden />
            <p className="text-[10px] font-medium text-label-tertiary">Daily pace</p>
          </div>
          <p className="text-[13px] font-bold tabular-nums leading-tight" style={{ color: paceColor }}>
            {formatINR(insights.daily_avg, true)}
            <span className="text-[10px] font-medium text-label-tertiary">/day</span>
          </p>
          <p className="text-[10px] text-label-tertiary tabular-nums mt-0.5">
            target {formatINR(targetDailySpend, true)}
          </p>
          {/* Comparison bar: actual vs target */}
          <div className="mt-1.5 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(paceBarPct / 2, 100)}%`,   // /2 because we cap at 200% → maps to 100% width
                background: paceColor,
                opacity: 0.7,
              }}
            />
          </div>
          {/* Ghost bar at 50% = target */}
          <div
            className="relative -mt-[3px] h-[3px] rounded-full overflow-hidden pointer-events-none"
            style={{ background: 'transparent' }}
          >
            <div
              aria-hidden
              className="absolute top-0 w-[1.5px] h-full bg-white/25"
              style={{ left: '50%' }}   // 50% = 1× target = the "on budget" mark
            />
          </div>
        </div>

      </div>
    </>
  )
}

// ── CTA — no budget set ───────────────────────────────────────────────────────

function BudgetCTA({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/[0.12] p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target size={20} className="text-accent-light" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-label-primary mb-1">
            Set a monthly budget
          </p>
          <p className="text-[13px] text-label-secondary leading-relaxed">
            Know exactly how much you can spend each day — and when to slow down.
          </p>
        </div>
      </div>

      <button
        onClick={onSetup}
        className={cn(
          'mt-4 w-full h-11 rounded-2xl',
          'bg-accent text-white',
          'text-[14px] font-semibold',
          'flex items-center justify-center gap-2',
          'active:scale-[0.97] transition-transform',
          'shadow-lg shadow-accent/20',
        )}
      >
        <Target size={15} aria-hidden />
        Set Budget
      </button>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <>
      <div className="border-t border-white/[0.06] mb-3" />
      <div className="h-[66px] shimmer rounded-xl mb-2" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-[76px] shimmer rounded-xl" />
        <div className="h-[76px] shimmer rounded-xl" />
      </div>
    </>
  )
}

function BudgetSkeleton() {
  return (
    <div className="rounded-3xl border border-white/[0.06] p-5 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1.5">
          <div className="h-2.5 w-28 shimmer rounded-full" />
          <div className="h-2 w-20 shimmer rounded-full" />
        </div>
        <div className="w-8 h-8 shimmer rounded-full" />
      </div>
      <div className="h-9 w-40 shimmer rounded-xl mb-1.5" />
      <div className="h-2 w-32 shimmer rounded-full mb-4" />
      <div className="h-[6px] shimmer rounded-full mb-3" />
      <div className="flex justify-between mb-3">
        <div className="h-2.5 w-16 shimmer rounded-full" />
        <div className="h-2.5 w-16 shimmer rounded-full" />
      </div>
      <div className="h-10 shimmer rounded-xl mb-3" />
      <div className="border-t border-white/[0.06] mb-3" />
      <div className="h-[66px] shimmer rounded-xl mb-2" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-[76px] shimmer rounded-xl" />
        <div className="h-[76px] shimmer rounded-xl" />
      </div>
    </div>
  )
}
