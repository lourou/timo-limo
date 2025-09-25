import { NextRequest } from 'next/server'
import { addSSEClient, removeSSEClient } from '@/app/api/upload/route'
import { getRecentPhotos } from '@/lib/kv'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      addSSEClient(controller)
      
      const recentPhotos = await getRecentPhotos(10)
      for (const photo of recentPhotos.reverse()) {
        const data = `data: ${JSON.stringify(photo)}\n\n`
        controller.enqueue(encoder.encode(data))
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