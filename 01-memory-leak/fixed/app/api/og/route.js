import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

// ✅ FIX: cache the Promise, not the resolved value.
// Caching the result has a race condition — with concurrent requests, multiple
// callers see `fontData === null` before the first read resolves and each
// starts their own readFile. Caching the Promise ensures only one read ever
// starts, and all concurrent callers await the same Promise.
let fontPromise = null

function getFont() {
  if (!fontPromise) {
    fontPromise = readFile(path.join(process.cwd(), 'public/Inter-Bold.ttf'))
  }
  return fontPromise
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Hello World'

  const font = await getFont() // all concurrent requests share the same Promise

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 40,
          background: '#0a0a0a',
          color: '#ffffff',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        {title}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: font, weight: 700 }],
    }
  )
}
