import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (!customer) return NextResponse.json({ workOrders: [] })

  const { data } = await supabaseAdmin
    .from('work_orders')
    .select(`
      id, work_order_number, status, problem_description, technician_notes,
      labor_hours, labor_type, labor_total, parts_total, grand_total,
      created_at, completed_at,
      equipment_list(equipment_type, brand, model)
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ workOrders: data ?? [] })
}
