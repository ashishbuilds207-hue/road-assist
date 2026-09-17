import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { DEMO_SESSION_COOKIE } from '@/types/rsa'

const PROTECTED_PREFIXES = [
  '/driver',
  '/company',
  '/provider',
  '/technician',
  '/admin',
]

const PUBLIC_AUTH_PATHS = ['/login', '/admin/login', '/register', '/forgot', '/password']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  if (PUBLIC_AUTH_PATHS.includes(pathname)) return true
  return false
}

function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.DEMO_MODE === 'true'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Collapse technician portal only (no technician portal — spec)
  if (pathname === '/technician' || pathname.startsWith('/technician/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/technician/, '/provider') || '/provider'
    return NextResponse.redirect(url)
  }

  const { user, supabaseResponse } = await updateSession(request)
  const hasDemoSession = Boolean(
    request.cookies.get(DEMO_SESSION_COOKIE)?.value
  )

  if (isProtectedPath(pathname)) {
    if (pathname === '/admin/login') {
      return supabaseResponse
    }

    const authenticated = Boolean(user) || (isDemoMode() && hasDemoSession)

    if (!authenticated) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = pathname.startsWith('/admin')
        ? '/admin/login'
        : '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
