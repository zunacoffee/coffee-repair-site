import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../../lib/adminAuth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const [invoiceRes, lineItemsRes] = await Promise.all([
    supabaseAdmin
      .from('invoices')
      .select('*, customers(id, full_name, email, phone)')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('id'),
  ])

  if (invoiceRes.error) {
    return NextResponse.json({ error: invoiceRes.error.message }, { status: 404 })
  }

  return NextResponse.json({
    invoice:   invoiceRes.data,
    lineItems: lineItemsRes.data ?? [],
  })
}
