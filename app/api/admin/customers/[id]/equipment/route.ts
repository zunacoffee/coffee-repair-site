import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  const body = await req.json()
  const { equipment_type, brand, model, serial_number } = body

  if (!equipment_type || !brand || !model || !serial_number) {
    return NextResponse.json({ error: 'All equipment fields are required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('equipment_list')
    .insert([{ customer_id: customerId, equipment_type, brand, model, serial_number }])
    .select('id, equipment_type, brand, model, serial_number')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ equipment: data })
}
