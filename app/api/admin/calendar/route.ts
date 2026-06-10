import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export type CalendarEvent = {
  id: string
  title: string
  date: string        // YYYY-MM-DD
  type: 'repair' | 'maintenance' | 'emergency'
  status: string
  customerName: string
  detail: string
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

  const [jobsRes, customersRes, plansRes] = await Promise.all([
    supabaseAdmin
      .from('repair_jobs')
      // scheduled_date is optional — added via migration; falls back to created_at below
      .select('id, equipment_type, status, description, customer_id, created_at, scheduled_date, priority')
      .or(`created_at.gte.${startISO},scheduled_date.gte.${startDate}`)
      .or(`created_at.lte.${endISO},scheduled_date.lte.${endDate}`),
    supabaseAdmin.from('customers').select('id, full_name'),
    supabaseAdmin
      .from('maintenance_plans')
      .select('id, plan_name, status, renewal_date')
      .gte('renewal_date', startDate)
      .lte('renewal_date', endDate)
      .not('renewal_date', 'is', null),
  ])

  if (jobsRes.error || customersRes.error) {
    // Fall back: fetch without optional columns if migration hasn't been run
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
    return buildResponse(fallbackJobs.data ?? [], fallbackCustomers.data ?? [], plansRes.data ?? [])
  }

  return buildResponse(jobsRes.data ?? [], customersRes.data ?? [], plansRes.data ?? [])
}

function buildResponse(
  jobs: Record<string, unknown>[],
  customers: Record<string, unknown>[],
  plans: Record<string, unknown>[],
): NextResponse {
  const customerMap: Record<string, string> = {}
  for (const c of customers) {
    customerMap[String(c.id)] = String(c.full_name)
  }

  const events: CalendarEvent[] = []

  for (const job of jobs) {
    // Use scheduled_date if present, otherwise created_at date portion
    const rawDate = (job.scheduled_date as string | null)
      ?? (job.created_at as string).split('T')[0]

    const priority = (job.priority as string | null) ?? 'normal'
    const type: CalendarEvent['type'] = priority === 'emergency' ? 'emergency' : 'repair'

    events.push({
      id: `job-${job.id}`,
      title: String(job.equipment_type),
      date: rawDate,
      type,
      status: String(job.status),
      customerName: customerMap[String(job.customer_id)] ?? 'Unknown',
      detail: String(job.description ?? ''),
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

  return NextResponse.json({ events })
}
