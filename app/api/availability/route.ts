import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 })
  }

  const [blockedRes, serviceReqRes, pmVisitRes] = await Promise.all([
    supabaseAdmin
      .from('blocked_dates')
      .select('date')
      .gte('date', start)
      .lte('date', end)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('service_requests')
      .select('scheduled_date, time_slot')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .not('scheduled_date', 'is', null)
      .neq('status', 'cancelled')
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('maintenance_plans')
      .select('next_visit_date, next_visit_slot')
      .gte('next_visit_date', start)
      .lte('next_visit_date', end)
      .not('next_visit_date', 'is', null)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
  ])

  const blocked = (blockedRes.data ?? []).map((r: Record<string, unknown>) => r.date as string)

  const booked: Record<string, string[]> = {}
  for (const r of serviceReqRes.data ?? []) {
    const row = r as Record<string, unknown>
    if (!row.scheduled_date || !row.time_slot) continue
    const d = row.scheduled_date as string
    if (!booked[d]) booked[d] = []
    if (!booked[d].includes(row.time_slot as string)) booked[d].push(row.time_slot as string)
  }
  for (const r of pmVisitRes.data ?? []) {
    const row = r as Record<string, unknown>
    if (!row.next_visit_date || !row.next_visit_slot) continue
    const d = row.next_visit_date as string
    if (!booked[d]) booked[d] = []
    if (!booked[d].includes(row.next_visit_slot as string)) booked[d].push(row.next_visit_slot as string)
  }

  return NextResponse.json({ blocked, booked })
}
