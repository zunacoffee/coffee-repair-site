import { NextRequest, NextResponse } from 'next/server'
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

  return NextResponse.json({ ok: true }, { status: 201 })
}
