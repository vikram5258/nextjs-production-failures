import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

// ✅ FIX: load font once at module level, outside the request handler
// This gets cached for the lifetime of the process
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
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
