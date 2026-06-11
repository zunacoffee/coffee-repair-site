import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../../lib/adminAuth'
import { Resend } from 'resend'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const [woRes, partsRes] = await Promise.all([
    supabaseAdmin
      .from('work_orders')
      .select(`
        id, work_order_number, status, problem_description, technician_notes,
        labor_hours, labor_type, labor_total, parts_total, grand_total, created_at,
        customers(full_name, email),
        equipment_list(equipment_type, brand, model, serial_number)
      `)
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('work_order_parts')
      .select('quantity_used, unit_price, total, parts_inventory(name, part_number)')
      .eq('work_order_id', id),
  ])

  if (woRes.error || !woRes.data) {
    return NextResponse.json({ error: 'Work order not found.' }, { status: 404 })
  }
  const wo = woRes.data
  const customer  = (wo as Record<string, unknown>).customers  as { full_name: string; email: string } | null
  const equipment = (wo as Record<string, unknown>).equipment_list as { equipment_type: string; brand: string; model: string; serial_number: string } | null

  if (!customer?.email) {
    return NextResponse.json({ error: 'No customer email on file.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email not configured.' }, { status: 500 })
  }

  const partsRows = (partsRes.data ?? []).map(p => {
    const inv = (p as Record<string, unknown>).parts_inventory as { name: string; part_number: string } | null
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #E8ECF0">${inv?.name ?? 'Part'}</td>
      <td style="padding:8px;border-bottom:1px solid #E8ECF0;text-align:center">${p.quantity_used}</td>
      <td style="padding:8px;border-bottom:1px solid #E8ECF0;text-align:right">$${Number(p.unit_price).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #E8ECF0;text-align:right">$${Number(p.total).toFixed(2)}</td>
    </tr>`
  }).join('')

  const STATUS_LABELS: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
  }

  const html = `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto">
  <div style="background:#0D1B2A;padding:24px 32px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
    <div>
      <h1 style="color:white;margin:0;font-size:22px">Cafe <span style="color:#B87333">Works</span></h1>
      <p style="color:#7A8898;margin:4px 0 0;font-size:13px">Work Order Details</p>
    </div>
    <div style="text-align:right">
      <p style="color:#B87333;font-weight:700;font-size:16px;margin:0">${wo.work_order_number}</p>
      <p style="color:#7A8898;font-size:12px;margin:4px 0 0">${STATUS_LABELS[wo.status] ?? wo.status}</p>
    </div>
  </div>
  <div style="background:#F4F6F9;padding:32px;border-radius:0 0 12px 12px">
    <p style="color:#0D1B2A;font-size:15px">Hi ${customer.full_name},</p>
    <p style="color:#0D1B2A">Here are the details for your work order:</p>

    ${equipment ? `
    <div style="background:white;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #B87333">
      <p style="color:#7A8898;font-size:11px;font-weight:600;margin:0 0 8px;text-transform:uppercase">Equipment</p>
      <p style="color:#0D1B2A;font-size:14px;margin:0">${equipment.brand} ${equipment.model} (${equipment.equipment_type})</p>
      ${equipment.serial_number ? `<p style="color:#7A8898;font-size:12px;margin:4px 0 0">S/N: ${equipment.serial_number}</p>` : ''}
    </div>` : ''}

    <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#7A8898;font-size:11px;font-weight:600;margin:0 0 8px;text-transform:uppercase">Problem Description</p>
      <p style="color:#0D1B2A;font-size:14px;margin:0">${wo.problem_description}</p>
    </div>

    ${wo.technician_notes ? `
    <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#7A8898;font-size:11px;font-weight:600;margin:0 0 8px;text-transform:uppercase">Technician Notes</p>
      <p style="color:#0D1B2A;font-size:14px;margin:0">${wo.technician_notes}</p>
    </div>` : ''}

    ${(partsRes.data ?? []).length > 0 ? `
    <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
      <p style="color:#7A8898;font-size:11px;font-weight:600;margin:0 0 12px;text-transform:uppercase">Parts Used</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F4F6F9">
            <th style="padding:8px;text-align:left;color:#7A8898;font-weight:600">Part</th>
            <th style="padding:8px;text-align:center;color:#7A8898;font-weight:600">Qty</th>
            <th style="padding:8px;text-align:right;color:#7A8898;font-weight:600">Unit</th>
            <th style="padding:8px;text-align:right;color:#7A8898;font-weight:600">Total</th>
          </tr>
        </thead>
        <tbody>${partsRows}</tbody>
      </table>
    </div>` : ''}

    <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#7A8898;font-size:13px">Labor (${wo.labor_type === 'weekend' ? 'Weekend' : 'Weekday'}, ${wo.labor_hours} hrs)</span>
        <span style="color:#0D1B2A;font-size:13px">$${Number(wo.labor_total).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#7A8898;font-size:13px">Parts</span>
        <span style="color:#0D1B2A;font-size:13px">$${Number(wo.parts_total).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #E8ECF0">
        <span style="color:#0D1B2A;font-weight:700;font-size:15px">Total</span>
        <span style="color:#B87333;font-weight:700;font-size:15px">$${Number(wo.grand_total).toFixed(2)}</span>
      </div>
    </div>

    <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/dashboard" style="display:inline-block;margin-top:8px;background:#B87333;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">View in Portal →</a>
    <p style="margin-top:24px;color:#7A8898;font-size:12px">Questions? Reply to this email or call us directly.</p>
  </div>
</div>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from:    'Cafe Works <onboarding@resend.dev>',
    to:      customer.email,
    subject: `Work Order ${wo.work_order_number} – Cafe Works`,
    html,
  })

  if (emailErr) return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
