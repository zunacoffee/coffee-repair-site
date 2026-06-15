import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const user = await authenticateAdminRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })

  const body = await req.json() as Record<string, unknown>

  if (body.mark_visit_complete) {
    const { data: plan, error: fetchErr } = await supabaseAdmin
      .from('maintenance_plans')
      .select('visit_frequency')
      .eq('id', id)
      .single()

    if (fetchErr || !plan) {
      return NextResponse.json({ error: fetchErr?.message ?? 'Plan not found.' }, { status: 404 })
    }

    const freq = (plan.visit_frequency as number) ?? 1
    const today = new Date()
    const next = new Date(today.getFullYear(), today.getMonth() + freq, today.getDate())
    const nextDateISO = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('maintenance_plans')
      .update({ next_visit_date: nextDateISO, next_visit_slot: null })
      .eq('id', id)
      .select('id, next_visit_date, next_visit_slot')
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ plan: updated })
  }

  return NextResponse.json({ error: 'No recognized operation.' }, { status: 400 })
}
