import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'
import { getSiteSettings, getBool, getNum } from '../../../../lib/siteSettings'
import { Resend } from 'resend'

export async function sendLowStockAlert(part: {
  name: string; part_number: string | null; quantity: number
}) {
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

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('parts_inventory')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parts: data })
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const settings  = await getSiteSettings()
  const markupPct = getNum(settings, 'parts_markup_pct') / 100 || 0.3
  const lowThresh = getNum(settings, 'parts_low_stock_threshold') || 1

  const cost_price = Number(body.cost_price ?? 0)
  const sell_price = Number(body.sell_price ?? 0) || Math.round(cost_price * (1 + markupPct) * 100) / 100
  const quantity   = Math.max(0, parseInt(String(body.quantity ?? 0), 10))
  const low_stock_threshold = Math.max(0, parseInt(String(body.low_stock_threshold ?? lowThresh), 10))

  const { data, error } = await supabaseAdmin
    .from('parts_inventory')
    .insert([{
      name,
      part_number: typeof body.part_number === 'string' ? body.part_number.trim() : null,
      cost_price,
      sell_price,
      quantity,
      low_stock_threshold,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data.quantity <= data.low_stock_threshold) {
    sendLowStockAlert(data)
  }

  return NextResponse.json({ part: data }, { status: 201 })
}
