import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabaseAdmin'

export async function authenticateAdminRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return null
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}
