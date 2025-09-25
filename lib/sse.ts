import { Photo } from './db-d1'

let sseClients = new Set<ReadableStreamDefaultController>()

export function addSSEClient(controller: ReadableStreamDefaultController) {
  sseClients.add(controller)
}

export function removeSSEClient(controller: ReadableStreamDefaultController) {
  sseClients.delete(controller)
}

export function broadcastPhoto(photo: Photo) {
  const data = `data: ${JSON.stringify(photo)}\n\n`
  const encoder = new TextEncoder()
  const message = encoder.encode(data)
  
  sseClients.forEach(controller => {
    try {
      controller.enqueue(message)
    } catch (error) {
      sseClients.delete(controller)
    }
  })
}