import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [customersRes, repairJobsRes, plansRes, serviceRequestsRes] = await Promise.all([
    supabaseAdmin.from('customers').select('id, full_name, email, phone'),
    supabaseAdmin.from('repair_jobs').select('id, equipment_type, status, description, notes, created_at, completed_at, customer_id').order('created_at', { ascending: false }),
    supabaseAdmin.from('maintenance_plans').select('id, plan_name, status, renewal_date').order('created_at', { ascending: false }),
    supabaseAdmin.from('service_requests').select('id, full_name, email, equipment_type, brand, issue_description, status, contact_preference, created_at').order('created_at', { ascending: false }).limit(20),
  ])

  const errors = [customersRes.error, repairJobsRes.error, plansRes.error, serviceRequestsRes.error].filter(Boolean)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0]?.message ?? 'Failed to load admin data.' }, { status: 500 })
  }

  return NextResponse.json({
    customers: customersRes.data,
    repairJobs: repairJobsRes.data,
    plans: plansRes.data,
    serviceRequests: serviceRequestsRes.data,
  })
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { customer_id, equipment_type, status, description } = body

  if (!customer_id || !equipment_type || !status || !description) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('repair_jobs').insert({
    customer_id: parseInt(customer_id, 10),
    equipment_type,
    status,
    description,
    created_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
