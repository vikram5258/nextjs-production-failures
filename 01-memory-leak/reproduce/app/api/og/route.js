import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

// ❌ BUG: font is loaded on every request — leaks memory in standalone builds
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Hello World'

  // This font load on every request is the leak source
  const font = await readFile(path.join(process.cwd(), 'public/Inter-Bold.ttf'))

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
