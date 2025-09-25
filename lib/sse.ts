import { Photo, getTotalPhotoCount } from './db-d1'

let sseClients = new Set<ReadableStreamDefaultController>()

export function addSSEClient(controller: ReadableStreamDefaultController) {
  sseClients.add(controller)
  console.log(`SSE client added. Total clients: ${sseClients.size}`)
}

export function removeSSEClient(controller: ReadableStreamDefaultController) {
  sseClients.delete(controller)
}

export async function broadcastPhoto(photo: Photo) {
  console.log(`Broadcasting photo to ${sseClients.size} clients:`, photo.id)

  try {
    const totalCount = await getTotalPhotoCount()
    const encoder = new TextEncoder()

    // Send the new photo
    const photoData = `data: ${JSON.stringify({ type: 'photo', ...photo })}\n\n`
    const photoMessage = encoder.encode(photoData)

    // Send updated count
    const countData = `data: ${JSON.stringify({ type: 'totalCount', count: totalCount })}\n\n`
    const countMessage = encoder.encode(countData)

    sseClients.forEach(controller => {
      try {
        console.log('Sending photo and count to SSE client')
        controller.enqueue(photoMessage)
        controller.enqueue(countMessage)
      } catch (error) {
        console.error('Failed to send message to SSE client:', error)
        sseClients.delete(controller)
      }
    })

    console.log(`Messages sent to ${sseClients.size} active clients`)
  } catch (error) {
    console.error('Error in broadcastPhoto:', error)
  }
}