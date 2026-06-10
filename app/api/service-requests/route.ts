import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

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
  } = body as Record<string, string>

  if (!full_name || !email || !phone || !equipment_type || !brand || !model || !issue_description || !contact_preference) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  if (!['email', 'phone'].includes(contact_preference)) {
    return NextResponse.json({ error: 'Invalid contact preference.' }, { status: 400 })
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
  }])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Cafe Works <onboarding@resend.dev>',
      to: 'tyson@zunacoffee.com',
      subject: `New service request – ${equipment_type} (${full_name})`,
      html: `
        <p>A new service request was submitted.</p>
        <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="color:#666;padding-right:16px;">Name</td><td><strong>${full_name}</strong></td></tr>
          <tr><td style="color:#666;">Email</td><td>${email}</td></tr>
          <tr><td style="color:#666;">Phone</td><td>${phone}</td></tr>
          <tr><td style="color:#666;">Equipment</td><td>${equipment_type}</td></tr>
          <tr><td style="color:#666;">Brand</td><td>${brand}</td></tr>
          <tr><td style="color:#666;">Model</td><td>${model}</td></tr>
          <tr><td style="color:#666;">Contact preference</td><td>${contact_preference}</td></tr>
        </table>
        <p style="margin-top:16px;"><strong>Issue description:</strong></p>
        <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${issue_description}</p>
        <p style="margin-top:24px;font-size:12px;color:#999;">View all requests in the <a href="https://cafeworks.com/admin/service-requests">admin dashboard</a>.</p>
      `,
    }).catch((err: unknown) => {
      console.error('Resend error:', err)
    })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
