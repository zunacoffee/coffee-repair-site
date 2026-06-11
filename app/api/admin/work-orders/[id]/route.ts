import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'
import { getSiteSettings, getNum, getBool } from '../../../../../lib/siteSettings'
import { Resend } from 'resend'

export async function GET(
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
        labor_hours, labor_type, labor_total, parts_total, grand_total,
        created_at, completed_at, scheduled_date, scheduled_time,
        customers(id, full_name, email, phone),
        equipment_list(id, equipment_type, brand, model, serial_number)
      `)
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('work_order_parts')
      .select('id, part_id, quantity_used, unit_price, total, parts_inventory(id, name, part_number)')
      .eq('work_order_id', id)
      .order('id'),
  ])

  if (woRes.error) return NextResponse.json({ error: woRes.error.message }, { status: 404 })
  return NextResponse.json({ workOrder: woRes.data, parts: partsRes.data ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  const settings = await getSiteSettings()
  const WEEKDAY_RATE = getNum(settings, 'labor_rate_weekday')
  const WEEKEND_RATE = getNum(settings, 'labor_rate_weekend')

  const VALID_STATUSES = ['open', 'in_progress', 'completed', 'cancelled']
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }
    updates.status = body.status
    if (body.status === 'completed') updates.completed_at = new Date().toISOString()
    if (body.status !== 'completed') updates.completed_at = null
  }
  if (body.problem_description !== undefined) updates.problem_description = body.problem_description
  if (body.technician_notes    !== undefined) updates.technician_notes    = body.technician_notes || null
  if (body.scheduled_date      !== undefined) updates.scheduled_date      = body.scheduled_date || null
  if (body.scheduled_time      !== undefined) updates.scheduled_time      = body.scheduled_time || null
  if (body.labor_hours !== undefined || body.labor_type !== undefined) {
    const { data: current } = await supabaseAdmin
      .from('work_orders')
      .select('labor_hours, labor_type, parts_total')
      .eq('id', id)
      .single()
    if (current) {
      const laborHours = Number(body.labor_hours ?? current.labor_hours)
      const laborType  = (body.labor_type ?? current.labor_type) as string
      const rate       = laborType === 'weekend' ? WEEKEND_RATE : WEEKDAY_RATE
      const laborTotal = Math.round(laborHours * rate * 100) / 100
      updates.labor_hours = laborHours
      updates.labor_type  = laborType
      updates.labor_total = laborTotal
      updates.grand_total = Math.round((laborTotal + Number(current.parts_total)) * 100) / 100
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('work_orders')
    .update(updates)
    .eq('id', id)
    .select('id, work_order_number, status, problem_description, technician_notes, labor_hours, labor_type, labor_total, parts_total, grand_total, completed_at, scheduled_date, scheduled_time')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (updates.status === 'completed' && process.env.RESEND_API_KEY && getBool(settings, 'notify_work_order_completed')) {
    const { data: wo } = await supabaseAdmin
      .from('work_orders')
      .select('work_order_number, customers(full_name, email), equipment_list(equipment_type, brand, model)')
      .eq('id', id)
      .single()

    if (wo) {
      const customer  = (wo as Record<string, unknown>).customers as { full_name: string; email: string } | null
      const equipment = (wo as Record<string, unknown>).equipment_list as { equipment_type: string; brand: string; model: string } | null
      const bizName   = settings.business_name ?? 'Cafe Works'
      if (customer?.email) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from:    `${bizName} <onboarding@resend.dev>`,
          to:      customer.email,
          subject: `Work Order ${wo.work_order_number} Completed`,
          html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
  <div style="background:#0D1B2A;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">${bizName.replace('Works', '<span style="color:#B87333">Works</span>')}</h1>
    <p style="color:#7A8898;margin:4px 0 0;font-size:13px">Work Order Complete</p>
  </div>
  <div style="background:#F4F6F9;padding:32px;border-radius:0 0 12px 12px">
    <p style="color:#0D1B2A;font-size:15px">Hi ${customer.full_name},</p>
    <p style="color:#0D1B2A">Your work order <strong>${wo.work_order_number}</strong> has been completed.</p>
    ${equipment ? `<p style="color:#7A8898;font-size:13px">Equipment: ${equipment.brand} ${equipment.model} (${equipment.equipment_type})</p>` : ''}
    <p style="color:#0D1B2A">You can view your invoice and work order details in your customer portal.</p>
    <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/dashboard" style="display:inline-block;margin-top:16px;background:#B87333;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">View Portal →</a>
    <p style="margin-top:24px;color:#7A8898;font-size:12px">Questions? Reply to this email or call us.</p>
  </div>
</div>`,
        }).catch((err: unknown) => console.error('Resend WO complete error:', err))
      }
    }
  }

  return NextResponse.json({ workOrder: data })
}
