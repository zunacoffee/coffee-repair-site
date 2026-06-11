import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('plan_settings')
    .select('id, plan_key, name, description, price, features, is_active')
    .eq('is_active', true)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
