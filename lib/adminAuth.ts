import { NextRequest } from 'next/server'

export function authenticateAdminRequest(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === '1'
}
