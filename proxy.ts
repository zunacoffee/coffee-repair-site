import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdminRequest } from './lib/adminAuth'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthenticated = authenticateAdminRequest(req)

  if (pathname === '/admin/login') {
    return isAuthenticated
      ? NextResponse.redirect(new URL('/admin', req.url))
      : NextResponse.next()
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
