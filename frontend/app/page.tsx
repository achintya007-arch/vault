import type { Metadata } from 'next'
import { DashboardView } from '@/components/dashboard/DashboardView'

export const metadata: Metadata = { title: 'Dashboard' }

// Data fetching and date logic live in DashboardView (Client Component)
// so that new Date() always runs in the user's browser timezone, never
// on the server in UTC.
export default function DashboardPage() {
  return <DashboardView />
}
