import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getSiteSettings, getBool } from '../../../lib/siteSettings'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const {
    full_name,
    email,
    phone,
    equipment_type,
    brand,
    model,
    issue_description,
    contact_preference,
    scheduled_date,
    time_slot,
    notes,
  } = body as Record<string, string>

  if (!full_name || !email || !phone || !equipment_type || !brand || !model || !issue_description || !contact_preference) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (!['email', 'phone'].includes(contact_preference)) {
    return NextResponse.json({ error: 'Invalid contact preference.' }, { status: 400 })
  }

  if (time_slot && !['morning', 'afternoon'].includes(time_slot)) {
    return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('service_requests').insert([{
    full_name,
    email,
    phone,
    equipment_type,
    brand,
    model,
    issue_description,
    contact_preference,
    scheduled_date: scheduled_date || null,
    time_slot: time_slot || null,
    notes: notes || null,
  }])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const slotLabel = time_slot === 'morning' ? 'Morning (8am–12pm)' : time_slot === 'afternoon' ? 'Afternoon (12pm–5pm)' : null
    const dateLabel = scheduled_date
      ? new Date(scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : null

    const settings = await getSiteSettings()
    const sendAdminNotif = getBool(settings, 'notify_new_service_request')
    const adminEmail = settings.notify_email || 'tyson@zunacoffee.com'

    const emailTasks: Promise<unknown>[] = []

    if (sendAdminNotif) {
      emailTasks.push(resend.emails.send({
        from: 'Cafe Works <onboarding@resend.dev>',
        to: adminEmail,
        subject: `New service request – ${equipment_type} (${full_name})`,
        html: `
          <p>A new service request was submitted.</p>
          <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr><td style="color:#666;padding-right:16px;">Name</td><td><strong>${full_name}</strong></td></tr>
            <tr><td style="color:#666;">Email</td><td>${email}</td></tr>
            <tr><td style="color:#666;">Phone</td><td>${phone}</td></tr>
            <tr><td style="color:#666;">Equipment</td><td>${equipment_type}</td></tr>
            <tr><td style="color:#666;">Brand / Model</td><td>${brand} ${model}</td></tr>
            <tr><td style="color:#666;">Contact preference</td><td>${contact_preference}</td></tr>
            ${dateLabel ? `<tr><td style="color:#666;">Preferred date</td><td><strong>${dateLabel}</strong></td></tr>` : ''}
            ${slotLabel ? `<tr><td style="color:#666;">Preferred time</td><td><strong>${slotLabel}</strong></td></tr>` : ''}
          </table>
          <p style="margin-top:16px;"><strong>Issue description:</strong></p>
          <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${issue_description}</p>
          ${notes ? `<p style="margin-top:8px;"><strong>Notes:</strong></p><p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${notes}</p>` : ''}
          <p style="margin-top:24px;font-size:12px;color:#999;">View all requests in the <a href="https://cafeworks.com/admin/service-requests">admin dashboard</a>.</p>
        `,
      }).catch(() => {}))
    }

    // Customer confirmation
    emailTasks.push(resend.emails.send({
        from: 'Cafe Works <onboarding@resend.dev>',
        to: email,
        subject: 'We received your service request – Cafe Works',
        html: `
          <p>Hi ${full_name},</p>
          <p>Thanks for reaching out! We've received your service request and will follow up within one business day.</p>
          <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:12px;">
            <tr><td style="color:#666;padding-right:16px;">Equipment</td><td>${equipment_type} – ${brand} ${model}</td></tr>
            ${dateLabel ? `<tr><td style="color:#666;">Preferred date</td><td><strong>${dateLabel}</strong></td></tr>` : ''}
            ${slotLabel ? `<tr><td style="color:#666;">Preferred time</td><td><strong>${slotLabel}</strong></td></tr>` : ''}
          </table>
          ${dateLabel ? '<p style="margin-top:16px;">We\'ll confirm your appointment shortly.</p>' : '<p style="margin-top:16px;">We\'ll be in touch to schedule your visit.</p>'}
          <p>— The Cafe Works Team</p>
        `,
      }).catch(() => {}))

    await Promise.all(emailTasks)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
