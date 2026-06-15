import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'
import { getSiteSettings, getBool } from '../../../../../lib/siteSettings'
import { Resend } from 'resend'

async function maybeSendLowStockAlert(part: {
  name: string; part_number: string | null; quantity: number; low_stock_threshold: number
}) {
  if (part.quantity > part.low_stock_threshold) return
  if (!process.env.RESEND_API_KEY) return
  const settings = await getSiteSettings()
  if (!getBool(settings, 'notify_low_stock')) return
  const toEmail = settings.notify_email
  if (!toEmail) return
  const bizName = settings.public_business_name || settings.business_name || 'Coffee Service'
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: `${bizName} <onboarding@resend.dev>`,
    to:   toEmail,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name        === 'string') updates.name        = body.name.trim()
  if (typeof body.part_number === 'string') updates.part_number = body.part_number.trim() || null
  if (typeof body.supplier    === 'string') updates.supplier    = body.supplier.trim() || null
  if (body.cost_price !== undefined)        updates.cost_price  = Number(body.cost_price)
  if (body.sell_price !== undefined)        updates.sell_price  = Number(body.sell_price)
  if (body.quantity   !== undefined)        updates.quantity    = Math.max(0, parseInt(String(body.quantity), 10))
  if (body.low_stock_threshold !== undefined)
    updates.low_stock_threshold = Math.max(0, parseInt(String(body.low_stock_threshold), 10))

  const { data, error } = await supabaseAdmin
    .from('parts_inventory')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  maybeSendLowStockAlert(data)
  return NextResponse.json({ part: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const { error } = await supabaseAdmin.from('parts_inventory').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
