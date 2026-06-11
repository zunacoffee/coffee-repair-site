import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { authenticateAdminRequest } from '../../../../lib/adminAuth'
import { SETTING_DEFAULTS } from '../../../../lib/siteSettings'

export async function GET(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = { ...SETTING_DEFAULTS }
  for (const row of (data ?? [])) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  if (!authenticateAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as Record<string, string>
  if (typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a key:value object.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: now,
  }))

  if (rows.length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabaseAdmin
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
