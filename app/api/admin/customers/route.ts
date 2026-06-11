import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id, full_name, email, phone, address')
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
  const { full_name, email, phone, address } = body

  if (!full_name || !email || !phone || !address) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert([{ full_name, email, phone, address }])
    .select('id, full_name, email, phone, address')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}
