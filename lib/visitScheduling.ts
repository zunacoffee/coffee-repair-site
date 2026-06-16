import { supabaseAdmin } from './supabaseAdmin'

// visit_frequency is visits per month (defaults to 1 when unset).
export function computeNextVisitDate(visitsPerMonth: number | null | undefined, from: Date = new Date()): string {
  const freq = visitsPerMonth && visitsPerMonth > 0 ? visitsPerMonth : 1
  const daysUntilNext = Math.round(30 / freq)
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysUntilNext)
  return toDateStr(next)
}

// Finds the first available PM slot within 14 days of startDate (skips weekends + blocked dates).
// Returns null if every slot in the lookahead window is booked.
export async function findFirstAvailableSlot(
  startDate: string,
): Promise<{ date: string; slot: string } | null> {
  const PM_SLOTS = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  ]

  // Work orders store scheduled_time as 24h HH:MM; convert to match PM_SLOTS labels.
  const TIME_24_TO_LABEL: Record<string, string> = {
    '08:00': '8:00 AM',  '09:00': '9:00 AM',  '10:00': '10:00 AM',
    '11:00': '11:00 AM', '12:00': '12:00 PM', '13:00': '1:00 PM',
    '14:00': '2:00 PM',  '15:00': '3:00 PM',  '16:00': '4:00 PM',
  }

  const MAX_DAYS = 14
  const endDate = new Date(startDate + 'T00:00:00')
  endDate.setDate(endDate.getDate() + MAX_DAYS - 1)
  const end = toDateStr(endDate)

  const [blockedRes, srRes, pmRes, woRes] = await Promise.all([
    supabaseAdmin.from('blocked_dates').select('date').gte('date', startDate).lte('date', end),
    supabaseAdmin.from('service_requests').select('scheduled_date, time_slot')
      .gte('scheduled_date', startDate).lte('scheduled_date', end)
      .not('scheduled_date', 'is', null).not('time_slot', 'is', null).neq('status', 'cancelled'),
    supabaseAdmin.from('maintenance_plans').select('next_visit_date, next_visit_slot')
      .gte('next_visit_date', startDate).lte('next_visit_date', end)
      .not('next_visit_date', 'is', null).not('next_visit_slot', 'is', null),
    supabaseAdmin.from('work_orders').select('scheduled_date, scheduled_time')
      .gte('scheduled_date', startDate).lte('scheduled_date', end)
      .not('scheduled_date', 'is', null).not('scheduled_time', 'is', null),
  ])

  const blockedSet = new Set((blockedRes.data ?? []).map((r) => (r as Record<string, unknown>).date as string))
  const booked: Record<string, Set<string>> = {}

  const addBooked = (date: string, slot: string) => {
    if (!booked[date]) booked[date] = new Set()
    booked[date].add(slot)
  }

  for (const r of (srRes.data ?? []) as Record<string, unknown>[]) {
    addBooked(r.scheduled_date as string, r.time_slot as string)
  }
  for (const r of (pmRes.data ?? []) as Record<string, unknown>[]) {
    addBooked(r.next_visit_date as string, r.next_visit_slot as string)
  }
  for (const r of (woRes.data ?? []) as Record<string, unknown>[]) {
    const label = TIME_24_TO_LABEL[r.scheduled_time as string] ?? (r.scheduled_time as string)
    addBooked(r.scheduled_date as string, label)
  }

  const current = new Date(startDate + 'T00:00:00')
  for (let i = 0; i < MAX_DAYS; i++) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
      const dateStr = toDateStr(current)
      if (!blockedSet.has(dateStr)) {
        const dayBooked = booked[dateStr] ?? new Set()
        for (const slot of PM_SLOTS) {
          if (!dayBooked.has(slot)) return { date: dateStr, slot }
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return null
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
