import { NextRequest } from 'next/server'
import { addSSEClient, removeSSEClient } from '@/lib/sse'
import { getRecentPhotos, getTotalPhotoCount } from '@/lib/db-d1'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      addSSEClient(controller)

      try {
        // Only show non-deleted photos in the stream
        const recentPhotos = await getRecentPhotos(15, false)
        const totalCount = await getTotalPhotoCount(false)

        // Send total count first
        const countData = `data: ${JSON.stringify({ type: 'totalCount', count: totalCount })}\n\n`
        controller.enqueue(encoder.encode(countData))

        // Send recent photos individually (newest first for initial load)
        for (const photo of recentPhotos) {
          const photoData = `data: ${JSON.stringify({ type: 'photo', ...photo })}\n\n`
          controller.enqueue(encoder.encode(photoData))
        }
      } catch (error) {
        console.error('Database error in SSE:', error)
        // Send empty response if database not available
        controller.enqueue(encoder.encode('data: {"type": "error"}\n\n'))
      }

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'))
        } catch (error) {
          clearInterval(keepAlive)
          removeSSEClient(controller)
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        removeSSEClient(controller)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}