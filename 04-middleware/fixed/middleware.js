// ✅ Edge-compatible middleware
// Uses jose instead of jsonwebtoken, excludes static assets from matcher

import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // ✅ jose uses Web Crypto API — works on Edge runtime
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    )
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// ✅ Exclude static assets, images, and health endpoint
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
}
