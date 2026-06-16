import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'
import { Resend } from 'resend'
import { getSiteSettings, getBool, getNum } from '../../../../lib/siteSettings'

// Low-stock alert helper (re-used after inventory deduction)
async function maybeSendLowStockAlert(part: {
  id: number; name: string; part_number: string | null; quantity: number; low_stock_threshold: number
}) {
  if (part.quantity > part.low_stock_threshold) return
  if (!process.env.RESEND_API_KEY) return
  const settings = await getSiteSettings()
  if (!getBool(settings, 'notify_low_stock')) return
  const toEmail = settings.notify_email
  if (!toEmail) return
  const businessName = settings.public_business_name || settings.business_name || 'Coffee Service'
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: `${businessName} <onboarding@resend.dev>`,
    to: toEmail,
    subject: `⚠️ Low stock: ${part.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px">
        <h2 style="color:#0D1B2A">Low Stock Alert</h2>
        <p><strong>${part.name}</strong>${part.part_number ? ` (${part.part_number})` : ''} is running low.</p>
        <p>Current quantity: <strong style="color:#dc2626">${part.quantity}</strong></p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/parts" style="color:#B87333">View inventory →</a></p>
      </div>`,
  }).catch((err: unknown) => console.error('Resend low-stock error:', err))
}

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('id, invoice_number, status, subtotal, total, created_at, customers(id, full_name, email)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data })
}

type LineItemInput = {
  type: 'labor' | 'part'
  description: string
  quantity: number
  unit_price: number
  total: number
  part_id?: number | null
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    customer_id?: number | null
    repair_job_id?: number | null
    notes?: string
    line_items?: LineItemInput[]
  }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const lineItems = body.line_items ?? []
  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  // Generate next invoice number
  const { data: lastInv } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (lastInv?.invoice_number) {
    const n = parseInt(lastInv.invoice_number.replace('INV-', ''), 10)
    if (!isNaN(n)) nextNum = n + 1
  }
  const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`

  const settings  = await getSiteSettings()
  const taxRate   = getNum(settings, 'tax_rate')
  const dueDays   = getNum(settings, 'invoice_due_days')

  const subtotal  = lineItems.reduce((s, item) => s + Number(item.total), 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total     = Math.round((subtotal + taxAmount) * 100) / 100
  const dueDate   = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Insert invoice
  const { data: invoice, error: invError } = await supabaseAdmin
    .from('invoices')
    .insert([{
      invoice_number: invoiceNumber,
      customer_id:    body.customer_id ?? null,
      repair_job_id:  body.repair_job_id ?? null,
      status:         'draft',
      subtotal:       Math.round(subtotal * 100) / 100,
      tax_amount:     taxAmount,
      total,
      due_date:       dueDays > 0 ? dueDate : null,
      notes:          body.notes ?? null,
    }])
    .select()
    .single()

  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })

  // Insert line items
  const { error: lineError } = await supabaseAdmin
    .from('invoice_line_items')
    .insert(lineItems.map((item) => ({
      invoice_id:  invoice.id,
      type:        item.type,
      description: item.description,
      quantity:    Number(item.quantity),
      unit_price:  Number(item.unit_price),
      total:       Number(item.total),
    })))

  if (lineError) return NextResponse.json({ error: lineError.message }, { status: 500 })

  // Deduct parts inventory & check low stock
  const partLines = lineItems.filter((i) => i.type === 'part' && i.part_id)
  for (const item of partLines) {
    const { data: part } = await supabaseAdmin
      .from('parts_inventory')
      .select('id, name, part_number, quantity, low_stock_threshold')
      .eq('id', item.part_id!)
      .single()
    if (!part) continue

    const newQty = part.quantity - Math.round(Number(item.quantity))
    const { data: updated } = await supabaseAdmin
      .from('parts_inventory')
      .update({ quantity: Math.max(0, newQty) })
      .eq('id', part.id)
      .select('id, name, part_number, quantity, low_stock_threshold')
      .single()

    if (updated) maybeSendLowStockAlert(updated)
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
