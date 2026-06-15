import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ customers: [], workOrders: [], invoices: [] })
  }

  const pattern = `%${q}%`

  const [customersRes, workOrdersRes, invoicesRes] = await Promise.all([
    supabaseAdmin
      .from('customers')
      .select('id, full_name, email')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),

    supabaseAdmin
      .from('work_orders')
      .select('id, work_order_number, status, problem_description, customers(full_name)')
      .or(`work_order_number.ilike.${pattern},problem_description.ilike.${pattern}`)
      .limit(5),

    supabaseAdmin
      .from('invoices')
      .select('id, invoice_number, status, total, customers(full_name)')
      .ilike('invoice_number', pattern)
      .limit(5),
  ])

  return NextResponse.json({
    customers: customersRes.data ?? [],
    workOrders: workOrdersRes.data ?? [],
    invoices: invoicesRes.data ?? [],
  })
}
