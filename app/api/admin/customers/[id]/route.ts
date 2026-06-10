import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  const [customerRes, equipmentRes, repairJobsRes, planRes] = await Promise.all([
    supabaseAdmin.from('customers').select('id, full_name, email, phone, address').eq('id', customerId).maybeSingle(),
    supabaseAdmin.from('equipment_list').select('id, equipment_type, brand, model, serial_number').eq('customer_id', customerId).order('id', { ascending: true }).then((result) => result),
    supabaseAdmin.from('repair_jobs').select('id, equipment_type, status, description, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabaseAdmin.from('maintenance_plans').select('id, plan_name, status, price, renewal_date').eq('customer_id', customerId).maybeSingle(),
  ])

  if (!customerRes.data) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
  }

  return NextResponse.json({
    customer: customerRes.data,
    equipment: equipmentRes.data ?? [],
    repairJobs: repairJobsRes.data ?? [],
    plan: planRes.data ?? null,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.full_name !== undefined) updates.full_name = body.full_name
  if (body.email !== undefined) updates.email = body.email
  if (body.phone !== undefined) updates.phone = body.phone
  if (body.address !== undefined) updates.address = body.address

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No update fields provided.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('customers').update(updates).eq('id', customerId).select('id, full_name, email, phone, address').maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('customers').delete().eq('id', customerId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
