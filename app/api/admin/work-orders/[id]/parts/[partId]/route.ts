import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../../lib/adminAuth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id, partId } = await params

  const { data: wop } = await supabaseAdmin
    .from('work_order_parts')
    .select('part_id, quantity_used')
    .eq('id', partId)
    .eq('work_order_id', id)
    .maybeSingle()

  if (!wop) return NextResponse.json({ error: 'Part not found on this work order.' }, { status: 404 })

  await supabaseAdmin.from('work_order_parts').delete().eq('id', partId)

  // Restore inventory
  const { data: inv } = await supabaseAdmin
    .from('parts_inventory')
    .select('quantity')
    .eq('id', wop.part_id)
    .maybeSingle()
  if (inv) {
    await supabaseAdmin
      .from('parts_inventory')
      .update({ quantity: inv.quantity + wop.quantity_used })
      .eq('id', wop.part_id)
  }

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

  return NextResponse.json({ ok: true })
}
