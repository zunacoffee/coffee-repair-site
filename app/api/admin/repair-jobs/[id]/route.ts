import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(jobId)) {
    return NextResponse.json({ error: 'Invalid job id.' }, { status: 400 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    updates.status = body.status
    updates.completed_at = body.status === 'completed' ? new Date().toISOString() : null
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No update fields provided.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('repair_jobs')
    .update(updates)
    .eq('id', jobId)
    .select('id, status, notes, completed_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ job: data })
}
