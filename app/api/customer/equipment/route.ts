import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as Record<string, string>
  const { equipment_type, brand, model, serial_number } = body

  if (!equipment_type || !brand || !model) {
    return NextResponse.json({ error: 'Equipment type, brand, and model are required.' }, { status: 400 })
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer record not found. Contact Cafe Works to link your account.' }, { status: 404 })
  }

  const { data: equipment, error: insertError } = await supabaseAdmin
    .from('equipment_list')
    .insert([{
      customer_id: (customer as Record<string, unknown>).id,
      equipment_type,
      brand,
      model,
      serial_number: serial_number || '',
    }])
    .select('id, equipment_type, brand, model, serial_number')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ equipment }, { status: 201 })
}
