import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

// ❌ BUG: font is loaded from disk on every single request — leaks memory in long-running processes
// The Buffer returned by readFile is never GC'd because ImageResponse
// holds a reference internally until the response is fully streamed.
// Under load, heap grows unbounded.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Hello World'

  // This readFile on every request is the leak source
  const font = await readFile(path.join(process.cwd(), 'public/Inter-Bold.ttf'))

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
