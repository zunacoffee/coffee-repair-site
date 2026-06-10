import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthenticated = req.cookies.get('admin_session')?.value === '1'

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
