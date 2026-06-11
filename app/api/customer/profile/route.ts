import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.full_name === 'string' && body.full_name.trim()) updates.full_name = body.full_name.trim()
  if (typeof body.phone     === 'string') updates.phone  = body.phone.trim()
  if (typeof body.street    === 'string') updates.street = body.street.trim() || null
  if (typeof body.city      === 'string') updates.city   = body.city.trim()   || null
  if (typeof body.state     === 'string') updates.state  = body.state.trim()  || null
  if (typeof body.zip       === 'string') updates.zip    = body.zip.trim()    || null

  if (body.street !== undefined || body.city !== undefined || body.state !== undefined || body.zip !== undefined) {
    const s  = (typeof body.street === 'string' ? body.street : '').trim()
    const c  = (typeof body.city   === 'string' ? body.city   : '').trim()
    const st = (typeof body.state  === 'string' ? body.state  : '').trim()
    const z  = (typeof body.zip    === 'string' ? body.zip    : '').trim()
    const locality = [st, z].filter(Boolean).join(' ')
    updates.address = [s, c, locality].filter(Boolean).join(', ')
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('email', user.email)
    .select('id, full_name, email, phone, address, street, city, state, zip')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ customer: data })
}
