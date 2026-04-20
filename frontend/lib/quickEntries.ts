// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A pinned "one-tap" transaction template. Stored in localStorage — no backend
 * involvement, no sync needed. A snapshot of the category is stored so the row
 * renders without waiting for the categories API.
 */
export interface QuickEntry {
  id:          string                   // "qe-{timestamp}"
  label:       string                   // user-provided, e.g. "Auto" / "Mess"
  amount:      number
  kind:        'expense' | 'income'
  category_id: number
  category: {
    id:    number
    name:  string
    icon:  string
    color: string
  }
  note?: string
}

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = 'vault:quickEntries'

export function loadQuickEntries(): QuickEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QuickEntry[]) : []
  } catch {
    return []
  }
}

function persist(entries: QuickEntry[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(entries)) } catch {}
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function addQuickEntry(data: Omit<QuickEntry, 'id'>): QuickEntry {
  const entry: QuickEntry = { ...data, id: `qe-${Date.now()}` }
  persist([...loadQuickEntries(), entry])
  return entry
}

export function removeQuickEntry(id: string): void {
  persist(loadQuickEntries().filter((e) => e.id !== id))
}

export function reorderQuickEntry(id: string, direction: 'left' | 'right'): void {
  const entries = loadQuickEntries()
  const idx = entries.findIndex((e) => e.id === id)
  if (idx === -1) return
  const swap = direction === 'left' ? idx - 1 : idx + 1
  if (swap < 0 || swap >= entries.length) return
  ;[entries[idx], entries[swap]] = [entries[swap], entries[idx]]
  persist(entries)
}
