import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'

export async function POST(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { plan_id?: number; customer_id?: number; visit_date?: string; notes?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { plan_id, customer_id, visit_date, notes } = body
  if (!plan_id || !customer_id || !visit_date) {
    return NextResponse.json({ error: 'plan_id, customer_id, and visit_date are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('pm_visits')
    .insert([{ plan_id, customer_id, visit_date, notes: notes ?? null }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ visit: data }, { status: 201 })
}
