import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

function buildAddress(street = '', city = '', state = '', zip = '') {
  const locality = [state.trim(), zip.trim()].filter(Boolean).join(' ')
  return [street.trim(), city.trim(), locality].filter(Boolean).join(', ')
}

export async function GET(req: NextRequest) {
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, email, phone, address, street, city, state, zip')
    .order('full_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customers: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { full_name, email, phone, street, city, state, zip } = body

  if (!full_name || !email || !phone || !street || !city) {
    return NextResponse.json({ error: 'Name, email, phone, street address, and city are required.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A customer with this email already exists.' }, { status: 409 })
  }

  const address = buildAddress(street, city, state, zip)

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert([{ full_name, email, phone, street, city, state: state || null, zip: zip || null, address }])
    .select('id, full_name, email, phone, address, street, city, state, zip')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}
