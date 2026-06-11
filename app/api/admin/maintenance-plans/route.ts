import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('maintenance_plans')
    .select('id, customer_id, plan_name, status, price, renewal_date, is_custom')
    .order('plan_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plans: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { customer_id, plan_name, status, price } = body

  if (!customer_id || !plan_name || !status || price == null) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('maintenance_plans').insert([
    { customer_id: parseInt(customer_id, 10), plan_name, status, price },
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: data?.[0] ?? null })
}
