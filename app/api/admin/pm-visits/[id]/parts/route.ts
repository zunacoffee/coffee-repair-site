import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: { description?: string; quantity?: number; unit_price?: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { description, quantity, unit_price } = body
  if (!description || quantity == null || unit_price == null) {
    return NextResponse.json({ error: 'description, quantity, and unit_price are required' }, { status: 400 })
  }

  const qty   = Math.max(1, Number(quantity))
  const price = Number(unit_price)
  const total = Math.round(qty * price * 100) / 100

  const { data, error } = await supabaseAdmin
    .from('pm_visit_parts')
    .insert([{ pm_visit_id: Number(id), description, quantity: qty, unit_price: price, total }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ part: data }, { status: 201 })
}
