import { NextRequest, NextResponse } from 'next/server'
import { uploadToR2, getPublicUrl } from '@/lib/r2'
import { addPhoto, getBatch, Photo } from '@/lib/db-d1'
// Note: Image processing moved to client-side or removed for Edge Runtime compatibility
import { broadcastPhoto } from '@/lib/sse'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'edge'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const batchId = formData.get('batchId') as string | null
    const fileId = formData.get('fileId') as string | null

    if (!file || !batchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Only image files are allowed (JPEG, PNG, WebP, HEIC)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
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

    // Upload original file directly (image optimization handled by Cloudflare)
    const originalKey = `photos/${batchId}/${photoId}.${file.name.split('.').pop()}`
    const thumbnailKey = `thumbnails/${batchId}/${photoId}.${file.name.split('.').pop()}`

    // Upload original file
    console.log(`Uploading to R2 - Original: ${originalKey}`)
    await uploadToR2(originalKey, buffer, file.type)

    // For now, use same file for thumbnail (can be optimized later with Cloudflare Images)
    console.log(`Uploading to R2 - Thumbnail: ${thumbnailKey}`)
    await uploadToR2(thumbnailKey, buffer, file.type)

    const originalUrl = getPublicUrl(originalKey)
    const thumbnailUrl = getPublicUrl(thumbnailKey)
    console.log(`Generated URLs - Original: ${originalUrl}, Thumbnail: ${thumbnailUrl}`)

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

    console.log('Adding photo to database:', JSON.stringify(photo, null, 2))
    await addPhoto(photo)
    console.log('Photo added to database successfully')

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