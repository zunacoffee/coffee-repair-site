import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .select('id, date, reason, created_at')
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ blockedDates: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { date?: string; reason?: string }
  const { date, reason } = body

  if (!date) {
    return NextResponse.json({ error: 'Date is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('blocked_dates')
    .insert([{ date, reason: reason ?? null }])
    .select('id, date, reason, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This date is already blocked.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ blockedDate: data }, { status: 201 })
}
