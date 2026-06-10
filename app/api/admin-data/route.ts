import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return null
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}

export async function GET(req: NextRequest) {
  const user = await authenticateRequest(req)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [customersRes, repairJobsRes, plansRes] = await Promise.all([
    supabaseAdmin.from('customers').select('id, full_name, email, phone'),
    supabaseAdmin.from('repair_jobs').select('id, equipment_type, status, description, created_at, customer_id'),
    supabaseAdmin.from('maintenance_plans').select('id, plan_name, status'),
  ])

  const errors = [customersRes.error, repairJobsRes.error, plansRes.error].filter((error) => error)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0]?.message ?? 'Failed to load admin data.' }, { status: 500 })
  }

  return NextResponse.json({
    customers: customersRes.data,
    repairJobs: repairJobsRes.data,
    plans: plansRes.data,
  })
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)

  if (!user) {
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
