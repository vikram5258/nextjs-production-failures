// ❌ Multiple bugs in this middleware — works in dev, fails in production
//
// Bug 1: matcher runs on ALL paths including static assets
// Bug 2: uses jsonwebtoken (Node.js crypto API — not available on Edge runtime)
// Bug 3: no fallback if token is missing

import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const token = request.cookies.get('token')?.value

  // ❌ jsonwebtoken uses Node.js crypto — throws on Edge runtime
  const payload = jwt.verify(token, process.env.JWT_SECRET)

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// ❌ Runs on everything including /_next/static, images, favicon
export const config = {
  matcher: '/:path*',
}
