// ── Base ──────────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Category {
  id:    number
  name:  string
  icon:  string
  color: string
  kind:  'income' | 'expense'
}

export interface TransactionCreate {
  amount:      number
  kind:        'income' | 'expense'
  category_id: number
  note?:       string
  date?:       string   // YYYY-MM-DD; omit to default to today server-side
}

export interface Transaction {
  id:         number
  amount:     number
  kind:       'income' | 'expense'
  note:       string | null
  date:       string
  created_at: string
  category:   Category
  client_id:  string | null
}

export interface Budget {
  id:            number
  monthly_limit: number
  created_at:    string
  updated_at:    string
}

export interface MonthlySummary {
  month:         string
  total_income:  number
  total_expense: number
  balance:       number
}

export interface CategoryBreakdown {
  category_id:   number
  category_name: string
  icon:          string
  color:         string
  total:         number
  pct:           number
}

export interface BudgetInsights {
  month:                  string
  daily_avg:              number
  projected_spend:        number   // linear baseline
  projected_spend_wk:     number   // weekday/weekend-aware (use this)
  weekday_avg:            number
  weekend_avg:            number
  weekdays_elapsed:       number
  weekend_days_elapsed:   number
  weekdays_remaining:     number
  weekend_days_remaining: number
  no_spend_days:          number
  elapsed_days:           number
  days_in_month:          number
  top_category:           CategoryBreakdown | null
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  categories: {
    list: (kind?: 'income' | 'expense') => {
      const qs = kind ? `?kind=${kind}` : ''
      return request<Category[]>(`/categories/${qs}`)
    },
  },

  transactions: {
    create: (data: TransactionCreate) =>
      request<Transaction>('/transactions/', {
        method: 'POST',
        body:   JSON.stringify(data),
      }),

    list: (params?: { kind?: string; month?: string; limit?: number }) => {
      const q = new URLSearchParams()
      if (params?.kind)  q.set('kind',  params.kind)
      if (params?.month) q.set('month', params.month)
      if (params?.limit) q.set('limit', String(params.limit))
      const qs = q.toString() ? `?${q}` : ''
      return request<Transaction[]>(`/transactions/${qs}`)
    },

    update: (id: number, data: Partial<TransactionCreate>) =>
      request<Transaction>(`/transactions/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify(data),
      }),

    delete: (id: number) =>
      request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  },

  analytics: {
    summary: (month: string) =>
      request<MonthlySummary>(`/analytics/summary?month=${month}`),

    byCategory: (month: string) =>
      request<CategoryBreakdown[]>(`/analytics/by-category?month=${month}`),

    budgetInsights: (month: string) =>
      request<BudgetInsights>(`/analytics/budget-insights?month=${month}`),
  },

  goals: {
    list: () => request<unknown[]>('/goals/'),
  },

  budget: {
    /** Returns the current budget or null if none has been set. */
    get: () =>
      request<Budget | null>('/budget/').catch((err: Error) => {
        // Treat 404 as "no budget" — backend returns null but guard anyway
        if (err.message.includes('404')) return null
        throw err
      }),

    set: (monthly_limit: number) =>
      request<Budget>('/budget/', {
        method: 'PUT',
        body:   JSON.stringify({ monthly_limit }),
      }),

    delete: () =>
      request<void>('/budget/', { method: 'DELETE' }),
  },
}
