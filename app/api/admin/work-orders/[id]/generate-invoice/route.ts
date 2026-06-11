import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'
import { getSiteSettings, getNum } from '../../../../../../lib/siteSettings'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const { data: wo } = await supabaseAdmin
    .from('work_orders')
    .select('id, work_order_number, customer_id, labor_type, labor_hours, labor_total, parts_total, grand_total')
    .eq('id', id)
    .single()

  if (!wo) return NextResponse.json({ error: 'Work order not found.' }, { status: 404 })

  const settings = await getSiteSettings()
  const WEEKDAY_RATE = getNum(settings, 'labor_rate_weekday') || 80
  const WEEKEND_RATE = getNum(settings, 'labor_rate_weekend') || 120

  const { data: parts } = await supabaseAdmin
    .from('work_order_parts')
    .select('id, quantity_used, unit_price, total, parts_inventory(name, part_number)')
    .eq('work_order_id', id)

  const lineItems: {
    type: string
    description: string
    quantity: number
    unit_price: number
    total: number
    part_id?: number | null
  }[] = []

  if (Number(wo.labor_hours) > 0) {
    const rate = wo.labor_type === 'weekend' ? WEEKEND_RATE : WEEKDAY_RATE
    lineItems.push({
      type:        'labor',
      description: `Labor – ${wo.labor_type === 'weekend' ? 'Weekend' : 'Weekday'} rate ($${rate}/hr) × ${wo.labor_hours} hrs`,
      quantity:    Number(wo.labor_hours),
      unit_price:  rate,
      total:       Number(wo.labor_total),
    })
  }

  for (const p of parts ?? []) {
    const inv = (p as Record<string, unknown>).parts_inventory as { name: string; part_number: string } | null
    lineItems.push({
      type:        'part',
      description: inv ? `${inv.name} (${inv.part_number})` : `Part #${p.id}`,
      quantity:    p.quantity_used,
      unit_price:  Number(p.unit_price),
      total:       Number(p.total),
      part_id:     (p as Record<string, unknown>).part_id as number ?? null,
    })
  }

  const subtotal    = lineItems.reduce((s, li) => s + li.total, 0)
  const invoiceData = {
    customer_id: wo.customer_id,
    status:      'draft',
    subtotal:    Math.round(subtotal * 100) / 100,
    total:       Math.round(subtotal * 100) / 100,
    notes:       `Generated from work order ${wo.work_order_number}`,
  }

  const { data: invoice, error: invErr } = await supabaseAdmin
    .from('invoices')
    .insert([invoiceData])
    .select('id, invoice_number, status, total')
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  if (lineItems.length > 0) {
    await supabaseAdmin.from('invoice_line_items').insert(
      lineItems.map(li => ({ ...li, invoice_id: invoice.id }))
    )
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
