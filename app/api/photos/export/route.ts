import { NextRequest, NextResponse } from 'next/server'
import { getAllBatches, getBatchPhotos, isPhotoDeleted, getPhotoComment } from '@/lib/db-d1'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const batchId = searchParams.get('batchId')

    if (batchId) {
      // Export specific batch
      const photos = await getBatchPhotos(batchId, true) // Include deleted to filter on client
      const nonDeletedPhotos = photos.filter(p => !isPhotoDeleted(p))

      return NextResponse.json({
        success: true,
        photos: nonDeletedPhotos.map(photo => ({
          id: photo.id,
          originalUrl: photo.originalUrl,
          originalFilename: photo.originalFilename || `photo-${photo.id}.jpg`,
          uploaderName: photo.uploaderName,
          comment: getPhotoComment(photo),
          uploadedAt: photo.uploadedAt,
          batchId: photo.batchId
        }))
      })
    }

    // Export all non-deleted photos grouped by batch
    const batches = await getAllBatches()
    const exportData = []

    for (const batch of batches) {
      const photos = await getBatchPhotos(batch.id, true)
      const nonDeletedPhotos = photos.filter(p => !isPhotoDeleted(p))

      if (nonDeletedPhotos.length > 0) {
        exportData.push({
          batch: {
            id: batch.id,
            uploaderName: batch.uploaderName,
            comment: batch.comment,
            timestamp: batch.timestamp
          },
          photos: nonDeletedPhotos.map(photo => ({
            id: photo.id,
            originalUrl: photo.originalUrl,
            originalFilename: photo.originalFilename || `photo-${photo.id}.jpg`,
            uploaderName: photo.uploaderName,
            comment: getPhotoComment(photo),
            uploadedAt: photo.uploadedAt,
            batchId: photo.batchId
          }))
        })
      }
    }

    return NextResponse.json({
      success: true,
      batches: exportData
    })
  } catch (error) {
    console.error('Error fetching export data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch export data' },
      { status: 500 }
    )
  }
}
