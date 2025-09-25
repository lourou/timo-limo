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
        const recentPhotos = await getRecentPhotos(15)
        const totalCount = await getTotalPhotoCount()

        // Send total count first
        const countData = `data: ${JSON.stringify({ type: 'totalCount', count: totalCount })}\n\n`
        controller.enqueue(encoder.encode(countData))

        // Send all recent photos as a batch for efficient loading
        if (recentPhotos.length > 0) {
          const photosData = `data: ${JSON.stringify({ type: 'initialPhotos', photos: recentPhotos.reverse() })}\n\n`
          controller.enqueue(encoder.encode(photosData))
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