import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('repair_jobs')
    .select('id, customer_id, equipment_type, status, description, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ repairJobs: data })
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { customer_id, equipment_type, status, description, scheduled_date, scheduled_time, is_emergency } = body

  if (!customer_id || !equipment_type || !status || !description) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('repair_jobs').insert({
    customer_id:    parseInt(customer_id, 10),
    equipment_type,
    status,
    description,
    scheduled_date: scheduled_date || null,
    scheduled_time: scheduled_time || null,
    is_emergency:   is_emergency === true,
    created_at:     new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ job: data }, { status: 201 })
}
