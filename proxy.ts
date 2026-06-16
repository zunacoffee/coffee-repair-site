import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdminRequest } from './lib/adminAuth'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isSameOriginRequest(req: NextRequest): boolean {
  const source = req.headers.get('origin') || req.headers.get('referer')
  if (!source) return false
  try {
    return new URL(source).origin === req.nextUrl.origin
  } catch {
    return false
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/admin/')) {
    if (!SAFE_METHODS.has(req.method) && !isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 })
    }
    return NextResponse.next()
  }

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
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
}
