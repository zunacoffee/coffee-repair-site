import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

const VALID_STATUSES = ['new', 'contacted', 'scheduled', 'completed']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
  }

  const body = await req.json() as Record<string, unknown>
  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body.scheduled_date !== undefined) updates.scheduled_date = body.scheduled_date || null
  if (body.time_slot !== undefined) {
    if (body.time_slot && !['morning', 'afternoon'].includes(body.time_slot as string)) {
      return NextResponse.json({ error: 'Invalid time slot.' }, { status: 400 })
    }
    updates.time_slot = body.time_slot || null
  }
  if (body.notes !== undefined) updates.notes = body.notes || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('service_requests')
    .update(updates)
    .eq('id', id)
    .select('id, status, scheduled_date, time_slot, notes')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ serviceRequest: data })
}
