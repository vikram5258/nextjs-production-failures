import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

// ✅ FIX: font loaded once at module level, cached in memory for all subsequent requests
// The module-level cache persists for the lifetime of the server process.
// Heap stays flat under load.
let fontData = null

async function getFont() {
  if (!fontData) {
    fontData = await readFile(path.join(process.cwd(), 'public/Inter-Bold.ttf'))
  }
  return fontData
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Hello World'

  const font = await getFont()

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
