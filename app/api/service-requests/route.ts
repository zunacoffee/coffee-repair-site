import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { getSiteSettings, getBool } from '../../../lib/siteSettings'

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m ? `${hr}:${String(m).padStart(2, '0')}${suffix}` : `${hr}${suffix}`
}

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

  const resolvedContactPref = ['email', 'phone'].includes(contact_preference) ? contact_preference : 'email'

  console.log('Form values:', { full_name, email, phone, equipment_type, brand, model, issue_description, contact_preference: resolvedContactPref, scheduled_date, time_slot })

  if (!full_name || !email || !phone || !equipment_type || !brand || !model || !issue_description) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (time_slot && typeof time_slot !== 'string') {
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
    contact_preference: resolvedContactPref,
    scheduled_date: scheduled_date || null,
    time_slot: time_slot || null,
    notes: notes || null,
  }])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const settings = await getSiteSettings()
    const businessName = settings.public_business_name || settings.business_name || 'Coffee Service'
    const fromField = `${businessName} <onboarding@resend.dev>`
    const morningLabel = `Morning (${fmtTime(settings.morning_slot_start || '08:00')}–${fmtTime(settings.morning_slot_end || '12:00')})`
    const afternoonLabel = `Afternoon (${fmtTime(settings.afternoon_slot_start || '12:00')}–${fmtTime(settings.afternoon_slot_end || '17:00')})`
    const slotLabel = time_slot === 'morning' ? morningLabel : time_slot === 'afternoon' ? afternoonLabel : null
    const dateLabel = scheduled_date
      ? new Date(scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : null

    const sendAdminNotif = getBool(settings, 'notify_new_service_request')
    const adminEmail = settings.notify_email

    const emailTasks: Promise<unknown>[] = []

    if (sendAdminNotif && adminEmail) {
      emailTasks.push(resend.emails.send({
        from: fromField,
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
            <tr><td style="color:#666;">Contact preference</td><td>${resolvedContactPref}</td></tr>
            ${dateLabel ? `<tr><td style="color:#666;">Preferred date</td><td><strong>${dateLabel}</strong></td></tr>` : ''}
            ${slotLabel ? `<tr><td style="color:#666;">Preferred time</td><td><strong>${slotLabel}</strong></td></tr>` : ''}
          </table>
          <p style="margin-top:16px;"><strong>Issue description:</strong></p>
          <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${issue_description}</p>
          ${notes ? `<p style="margin-top:8px;"><strong>Notes:</strong></p><p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${notes}</p>` : ''}
          <p style="margin-top:24px;font-size:12px;color:#999;">View all requests in the <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/admin/service-requests">admin dashboard</a>.</p>
        `,
      }).catch(() => {}))
    }

    // Customer confirmation
    emailTasks.push(resend.emails.send({
        from: fromField,
        to: email,
        subject: `We received your service request – ${businessName}`,
        html: `
          <p>Hi ${full_name},</p>
          <p>Thanks for reaching out! We've received your service request and will follow up within one business day.</p>
          <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;margin-top:12px;">
            <tr><td style="color:#666;padding-right:16px;">Equipment</td><td>${equipment_type} – ${brand} ${model}</td></tr>
            ${dateLabel ? `<tr><td style="color:#666;">Preferred date</td><td><strong>${dateLabel}</strong></td></tr>` : ''}
            ${slotLabel ? `<tr><td style="color:#666;">Preferred time</td><td><strong>${slotLabel}</strong></td></tr>` : ''}
          </table>
          ${dateLabel ? '<p style="margin-top:16px;">We\'ll confirm your appointment shortly.</p>' : '<p style="margin-top:16px;">We\'ll be in touch to schedule your visit.</p>'}
          <p>— The ${businessName} Team</p>
        `,
      }).catch(() => {}))

    await Promise.all(emailTasks)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
