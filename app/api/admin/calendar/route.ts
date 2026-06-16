import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export type CalendarEvent = {
  id: string
  title: string
  date: string        // YYYY-MM-DD
  type: 'repair' | 'maintenance' | 'emergency' | 'service_request' | 'work_order'
  status: string
  customerName: string
  detail: string
  time_slot?: string | null
  scheduled_time?: string | null
}

export type BlockedDate = {
  id: number
  date: string
  reason: string | null
}

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month.' }, { status: 400 })
  }

  const mm       = String(month).padStart(2, '0')
  const startISO = `${year}-${mm}-01T00:00:00.000Z`
  const lastDay  = new Date(year, month, 0).getDate()
  const endISO   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
  const startDate = `${year}-${mm}-01`
  const endDate   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  const [jobsRes, customersRes, plansRes, visitsRes, serviceReqRes, blockedRes, workOrdersRes] = await Promise.all([
    supabaseAdmin
      .from('repair_jobs')
      .select('id, equipment_type, status, description, customer_id, created_at, scheduled_date, scheduled_time, is_emergency')
      .or(`created_at.gte.${startDate},scheduled_date.gte.${startDate}`)
      .or(`created_at.lte.${endDate},scheduled_date.lte.${endDate}`),
    supabaseAdmin.from('customers').select('id, full_name'),
    supabaseAdmin
      .from('maintenance_plans')
      .select('id, plan_name, status, renewal_date')
      .gte('renewal_date', startDate)
      .lte('renewal_date', endDate)
      .not('renewal_date', 'is', null),
    supabaseAdmin
      .from('maintenance_plans')
      .select('id, plan_name, status, customer_id, next_visit_date, next_visit_slot')
      .gte('next_visit_date', startDate)
      .lte('next_visit_date', endDate)
      .not('next_visit_date', 'is', null)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('service_requests')
      .select('id, full_name, equipment_type, issue_description, status, scheduled_date')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .not('scheduled_date', 'is', null)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('blocked_dates')
      .select('id, date, reason')
      .gte('date', startDate)
      .lte('date', endDate)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('work_orders')
      .select('id, status, scheduled_date, scheduled_time')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .not('scheduled_date', 'is', null)
      .then((r) => ({ data: r.data ?? [], error: r.error })),
  ])

  let jobsData: Record<string, unknown>[] = (jobsRes.data ?? []) as Record<string, unknown>[]
  let customersData: Record<string, unknown>[] = (customersRes.data ?? []) as Record<string, unknown>[]

  if (jobsRes.error) console.error('repair_jobs query error:', jobsRes.error.message)
  if (jobsRes.error || customersRes.error) {
    const [fallbackJobs, fallbackCustomers] = await Promise.all([
      supabaseAdmin
        .from('repair_jobs')
        .select('id, equipment_type, status, description, customer_id, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO),
      supabaseAdmin.from('customers').select('id, full_name'),
    ])
    if (fallbackJobs.error) {
      return NextResponse.json({ error: fallbackJobs.error.message }, { status: 500 })
    }
    jobsData = (fallbackJobs.data ?? []) as Record<string, unknown>[]
    customersData = fallbackCustomers.data ?? []
  }

  return buildResponse(
    jobsData,
    customersData,
    plansRes.data ?? [],
    visitsRes.data ?? [],
    serviceReqRes.data ?? [],
    blockedRes.data ?? [],
    workOrdersRes.data ?? [],
  )
}

function buildResponse(
  jobs: Record<string, unknown>[],
  customers: Record<string, unknown>[],
  plans: Record<string, unknown>[],
  visits: Record<string, unknown>[],
  serviceRequests: Record<string, unknown>[],
  blockedDates: Record<string, unknown>[],
  workOrders: Record<string, unknown>[] = [],
): NextResponse {
  const customerMap: Record<string, string> = {}
  for (const c of customers) {
    customerMap[String(c.id)] = String(c.full_name)
  }

  const events: CalendarEvent[] = []

  for (const job of jobs) {
    const rawDate = (job.scheduled_date as string | null)
      ?? (job.created_at as string).split('T')[0]

    events.push({
      id: `job-${job.id}`,
      title: String(job.equipment_type ?? 'Repair'),
      date: rawDate,
      type: job.is_emergency ? 'emergency' : 'repair',
      status: String(job.status),
      customerName: customerMap[String(job.customer_id)] ?? 'Unknown',
      detail: String(job.description ?? ''),
      scheduled_time: (job.scheduled_time as string | null) ?? null,
    })
  }

  for (const plan of plans) {
    events.push({
      id: `plan-${plan.id}`,
      title: String(plan.plan_name ?? `Plan #${plan.id}`),
      date: String(plan.renewal_date),
      type: 'maintenance',
      status: String(plan.status),
      customerName: '',
      detail: 'Maintenance plan renewal',
    })
  }

  for (const visit of visits) {
    events.push({
      id: `visit-${visit.id}`,
      title: String(visit.plan_name ?? `Plan #${visit.id}`),
      date: String(visit.next_visit_date),
      type: 'maintenance',
      status: String(visit.status),
      customerName: customerMap[String(visit.customer_id)] ?? '',
      detail: 'Scheduled PM visit',
      time_slot: (visit.next_visit_slot as string | null) ?? null,
    })
  }

  for (const sr of serviceRequests) {
    if (!sr.scheduled_date) continue
    events.push({
      id: `sr-${sr.id}`,
      title: String(sr.equipment_type ?? 'Service Request'),
      date: String(sr.scheduled_date),
      type: 'service_request',
      status: String(sr.status),
      customerName: String(sr.full_name ?? ''),
      detail: String(sr.issue_description ?? ''),
    })
  }

  for (const wo of workOrders) {
    if (!wo.scheduled_date) continue
    events.push({
      id: `wo-${wo.id}`,
      title: `WO #${wo.id}`,
      date: String(wo.scheduled_date),
      type: 'work_order',
      status: String(wo.status),
      customerName: '',
      detail: '',
      scheduled_time: (wo.scheduled_time as string | null) ?? null,
    })
  }

  const blocked: BlockedDate[] = blockedDates.map((b) => ({
    id: Number(b.id),
    date: String(b.date),
    reason: (b.reason as string | null) ?? null,
  }))

  return NextResponse.json({ events, blockedDates: blocked })
}
