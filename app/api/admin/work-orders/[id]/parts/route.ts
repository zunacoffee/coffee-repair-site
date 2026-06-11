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
  const body = await req.json() as { part_id: number; quantity_used: number }

  if (!body.part_id || !body.quantity_used) {
    return NextResponse.json({ error: 'part_id and quantity_used are required.' }, { status: 400 })
  }

  const qty = Math.max(1, Number(body.quantity_used))

  const { data: part } = await supabaseAdmin
    .from('parts_inventory')
    .select('id, name, part_number, sell_price, quantity')
    .eq('id', body.part_id)
    .maybeSingle()

  if (!part) return NextResponse.json({ error: 'Part not found.' }, { status: 404 })
  if (part.quantity < qty) {
    return NextResponse.json({ error: `Only ${part.quantity} in stock.` }, { status: 400 })
  }

  const unitPrice = Number(part.sell_price)
  const total     = Math.round(unitPrice * qty * 100) / 100

  const { data: wop, error: wopErr } = await supabaseAdmin
    .from('work_order_parts')
    .insert([{ work_order_id: id, part_id: body.part_id, quantity_used: qty, unit_price: unitPrice, total }])
    .select('id, part_id, quantity_used, unit_price, total')
    .single()

  if (wopErr) return NextResponse.json({ error: wopErr.message }, { status: 500 })

  await supabaseAdmin
    .from('parts_inventory')
    .update({ quantity: part.quantity - qty })
    .eq('id', body.part_id)

  // Recalculate totals
  const { data: allParts } = await supabaseAdmin
    .from('work_order_parts')
    .select('total')
    .eq('work_order_id', id)

  const partsTotal = (allParts ?? []).reduce((s, p) => s + Number(p.total), 0)
  const { data: wo } = await supabaseAdmin
    .from('work_orders')
    .select('labor_total')
    .eq('id', id)
    .single()
  const grandTotal = Math.round((partsTotal + Number(wo?.labor_total ?? 0)) * 100) / 100

  await supabaseAdmin
    .from('work_orders')
    .update({ parts_total: Math.round(partsTotal * 100) / 100, grand_total: grandTotal })
    .eq('id', id)

  return NextResponse.json({ part: { ...wop, parts_inventory: { name: part.name, part_number: part.part_number } } }, { status: 201 })
}
