import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const TIME_24_TO_LABEL: Record<string, string> = {
  '08:00': '8:00 AM',  '08:30': '8:30 AM',
  '09:00': '9:00 AM',  '09:30': '9:30 AM',
  '10:00': '10:00 AM', '10:30': '10:30 AM',
  '11:00': '11:00 AM', '11:30': '11:30 AM',
  '12:00': '12:00 PM', '12:30': '12:30 PM',
  '13:00': '1:00 PM',  '13:30': '1:30 PM',
  '14:00': '2:00 PM',  '14:30': '2:30 PM',
  '15:00': '3:00 PM',  '15:30': '3:30 PM',
  '16:00': '4:00 PM',  '16:30': '4:30 PM',
  '17:00': '5:00 PM',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 })
  }

  const [blockedRes, serviceReqRes, pmVisitRes, workOrderRes] = await Promise.all([
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
    supabaseAdmin
      .from('work_orders')
      .select('scheduled_date, scheduled_time')
      .gte('scheduled_date', start)
      .lte('scheduled_date', end)
      .not('scheduled_date', 'is', null)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
  ])

  const blocked = (blockedRes.data ?? []).map((r: Record<string, unknown>) => r.date as string)

  const booked: Record<string, string[]> = {}
  const addBooked = (date: string, slot: string) => {
    if (!booked[date]) booked[date] = []
    if (!booked[date].includes(slot)) booked[date].push(slot)
  }

  for (const r of serviceReqRes.data ?? []) {
    const row = r as Record<string, unknown>
    if (!row.scheduled_date || !row.time_slot) continue
    addBooked(row.scheduled_date as string, row.time_slot as string)
  }
  for (const r of pmVisitRes.data ?? []) {
    const row = r as Record<string, unknown>
    if (!row.next_visit_date || !row.next_visit_slot) continue
    addBooked(row.next_visit_date as string, row.next_visit_slot as string)
  }
  for (const r of workOrderRes.data ?? []) {
    const row = r as Record<string, unknown>
    if (!row.scheduled_date || !row.scheduled_time) continue
    const label = TIME_24_TO_LABEL[row.scheduled_time as string] ?? (row.scheduled_time as string)
    addBooked(row.scheduled_date as string, label)
  }

  return NextResponse.json({ blocked, booked })
}
