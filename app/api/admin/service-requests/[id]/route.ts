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

  const body = await req.json()

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('service_requests')
    .update({ status: body.status })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ serviceRequest: data })
}
