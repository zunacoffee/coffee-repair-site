import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [customersRes, plansRes, serviceRequestsRes] = await Promise.all([
    supabaseAdmin.from('customers').select('id, full_name, email, phone'),
    supabaseAdmin.from('maintenance_plans').select('id, plan_name, status, renewal_date').order('created_at', { ascending: false }),
    supabaseAdmin.from('service_requests').select('id, full_name, email, equipment_type, brand, issue_description, status, contact_preference, created_at').order('created_at', { ascending: false }).limit(20),
  ])

  const errors = [customersRes.error, plansRes.error, serviceRequestsRes.error].filter(Boolean)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0]?.message ?? 'Failed to load admin data.' }, { status: 500 })
  }

  return NextResponse.json({
    customers: customersRes.data,
    plans: plansRes.data,
    serviceRequests: serviceRequestsRes.data,
  })
}

