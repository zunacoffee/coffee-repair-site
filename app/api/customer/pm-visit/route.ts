import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getSiteSettings } from '../../../../lib/siteSettings'

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { next_visit_date?: string; next_visit_slot?: string }
  const { next_visit_date, next_visit_slot } = body

  if (!next_visit_date || !next_visit_slot) {
    return NextResponse.json({ error: 'Date and time slot are required.' }, { status: 400 })
  }

  if (!['morning', 'afternoon'].includes(next_visit_slot)) {
    return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, email')
    .eq('email', user.email)
    .maybeSingle()

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from('maintenance_plans')
    .update({ next_visit_date, next_visit_slot })
    .eq('customer_id', (customer as Record<string, unknown>).id)
    .select('id, plan_name, status, price, renewal_date, next_visit_date, next_visit_slot')
    .maybeSingle()

  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message ?? 'No maintenance plan found.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const settings = await getSiteSettings()
    const adminEmail = settings.notify_email || 'tyson@zunacoffee.com'
    const slotLabel = next_visit_slot === 'morning' ? 'Morning (8am–12pm)' : 'Afternoon (12pm–5pm)'
    const dateLabel = new Date(next_visit_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const custRecord = customer as { full_name: string; email: string }
    const planRecord = plan as { plan_name: string }

    await Promise.all([
      resend.emails.send({
        from: 'Cafe Works <onboarding@resend.dev>',
        to: custRecord.email,
        subject: `PM Visit Confirmed – ${dateLabel}`,
        html: `
          <p>Hi ${custRecord.full_name},</p>
          <p>Your preventive maintenance visit has been scheduled:</p>
          <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr><td style="color:#666;padding-right:16px;">Date</td><td><strong>${dateLabel}</strong></td></tr>
            <tr><td style="color:#666;">Time</td><td><strong>${slotLabel}</strong></td></tr>
            <tr><td style="color:#666;">Plan</td><td>${planRecord.plan_name}</td></tr>
          </table>
          <p style="margin-top:16px;">If you need to reschedule, log in to your <a href="https://cafeworks.com/dashboard">customer portal</a>.</p>
          <p>— The Cafe Works Team</p>
        `,
      }).catch(() => {}),
      resend.emails.send({
        from: 'Cafe Works <onboarding@resend.dev>',
        to: adminEmail,
        subject: `PM Visit Scheduled – ${custRecord.full_name} (${dateLabel})`,
        html: `
          <p>A customer has scheduled a PM visit.</p>
          <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr><td style="color:#666;padding-right:16px;">Customer</td><td><strong>${custRecord.full_name}</strong></td></tr>
            <tr><td style="color:#666;">Email</td><td>${custRecord.email}</td></tr>
            <tr><td style="color:#666;">Date</td><td><strong>${dateLabel}</strong></td></tr>
            <tr><td style="color:#666;">Time</td><td><strong>${slotLabel}</strong></td></tr>
            <tr><td style="color:#666;">Plan</td><td>${planRecord.plan_name}</td></tr>
          </table>
        `,
      }).catch(() => {}),
    ])
  }

  return NextResponse.json({ plan })
}
