import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, email, phone, address, street, city, state, zip')
    .eq('email', user.email)
    .maybeSingle()

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 })
  }

  if (!customer) {
    return NextResponse.json({
      customer: null,
      userEmail: user.email,
      equipment: [],
      repairJobs: [],
      plan: null,
      invoices: [],
      workOrders: [],
    })
  }

  const [equipmentRes, repairJobsRes, planRes, invoicesRes, workOrdersRes] = await Promise.all([
    supabaseAdmin
      .from('equipment_list')
      .select('id, equipment_type, brand, model, serial_number')
      .eq('customer_id', customer.id)
      .order('id', { ascending: true }),
    supabaseAdmin
      .from('repair_jobs')
      .select('id, equipment_type, status, description, created_at, completed_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('maintenance_plans')
      .select('id, plan_name, status, price, renewal_date, next_visit_date, next_visit_slot, notes, is_custom, stripe_payment_link, description, visit_frequency, features')
      .eq('customer_id', customer.id)
      .maybeSingle(),
    supabaseAdmin
      .from('invoices')
      .select('id, amount, status, due_date, description, created_at, stripe_payment_link')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .then((r) => ({ data: r.data ?? [], error: r.error })),
    supabaseAdmin
      .from('work_orders')
      .select('id, work_order_number, status, problem_description, grand_total, created_at, completed_at, equipment_list(equipment_type, brand, model)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .then((r) => ({ data: r.data ?? [], error: r.error })),
  ])

  return NextResponse.json({
    customer,
    userEmail: user.email,
    equipment: equipmentRes.data ?? [],
    repairJobs: repairJobsRes.data ?? [],
    plan: planRes.data ?? null,
    invoices: invoicesRes.data ?? [],
    workOrders: workOrdersRes.data ?? [],
  })
}
