import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const user = await authenticateAdminRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const customerId = parseInt(resolvedParams.id, 10)
  if (Number.isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer id.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('customers').delete().eq('id', customerId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
