import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, getPublicUrl } from '@/lib/r2'
import { addPhoto, getBatch, Photo } from '@/lib/kv'
import { createThumbnail, optimizeImage } from '@/lib/image'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '20971520')

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const batchId = formData.get('batchId') as string
    const fileId = formData.get('fileId') as string

    if (!file || !batchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds limit' },
        { status: 400 }
      )
    }

    const batch = await getBatch(batchId)
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const photoId = fileId || uuidv4()
    const timestamp = Date.now()
    
    const [optimizedBuffer, thumbnailBuffer] = await Promise.all([
      optimizeImage(buffer, { width: 2400, quality: 90 }),
      createThumbnail(buffer, 800, 800)
    ])

    const originalKey = `photos/${batchId}/${photoId}.jpg`
    const thumbnailKey = `thumbnails/${batchId}/${photoId}.jpg`

    const [originalUrl, thumbnailUrl] = await Promise.all([
      uploadToR2(originalKey, optimizedBuffer, 'image/jpeg').then(() => getPublicUrl(originalKey)),
      uploadToR2(thumbnailKey, thumbnailBuffer, 'image/jpeg').then(() => getPublicUrl(thumbnailKey))
    ])

    const photo: Photo = {
      id: photoId,
      batchId,
      originalUrl,
      thumbnailUrl,
      uploaderName: batch.uploaderName,
      comment: batch.comment,
      uploadedAt: timestamp,
      order: timestamp,
    }

    await addPhoto(photo)
    
    broadcastPhoto(photo)

    return NextResponse.json({
      success: true,
      photo,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}