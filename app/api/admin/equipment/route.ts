import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [equipmentRes, customersRes] = await Promise.all([
    supabaseAdmin
      .from('equipment_list')
      .select('id, customer_id, equipment_type, brand, model, serial_number, created_at')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('customers')
      .select('id, full_name, email'),
  ])

  if (equipmentRes.error) return NextResponse.json({ error: equipmentRes.error.message }, { status: 500 })

  const customerMap = Object.fromEntries(
    (customersRes.data ?? []).map((c) => [c.id, c])
  )

  const equipment = (equipmentRes.data ?? []).map((eq) => ({
    ...eq,
    customers: customerMap[eq.customer_id] ?? null,
  }))

  return NextResponse.json({ equipment })
}
