import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const { data: sr, error: srError } = await supabaseAdmin
    .from('service_requests')
    .select('id, full_name, email, equipment_type, brand, model, issue_description')
    .eq('id', id)
    .maybeSingle()

  if (srError || !sr) {
    return NextResponse.json({ error: 'Service request not found.' }, { status: 404 })
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', sr.email)
    .maybeSingle()

  if (!customer) {
    return NextResponse.json(
      { error: 'No customer account found for this email. Create the customer first, then convert.' },
      { status: 404 },
    )
  }

  // Generate WO number
  const { data: lastWO } = await supabaseAdmin
    .from('work_orders')
    .select('work_order_number')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (lastWO?.work_order_number) {
    const match = lastWO.work_order_number.match(/WO-(\d+)/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  const workOrderNumber = `WO-${String(nextNum).padStart(4, '0')}`

  // Find matching equipment
  const { data: equipment } = await supabaseAdmin
    .from('equipment_list')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('equipment_type', sr.equipment_type)
    .limit(1)
    .maybeSingle()

  const { data: workOrder, error: woError } = await supabaseAdmin
    .from('work_orders')
    .insert([{
      work_order_number:   workOrderNumber,
      customer_id:         customer.id,
      equipment_id:        equipment?.id ?? null,
      problem_description: sr.issue_description,
      status:              'open',
      labor_type:          'weekday',
      labor_hours:         0,
      labor_total:         0,
      parts_total:         0,
      grand_total:         0,
    }])
    .select('id, work_order_number, status, created_at')
    .single()

  if (woError) return NextResponse.json({ error: woError.message }, { status: 500 })

  await supabaseAdmin
    .from('service_requests')
    .update({ status: 'scheduled' })
    .eq('id', id)

  return NextResponse.json({ workOrder }, { status: 201 })
}
