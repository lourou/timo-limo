import { NextRequest, NextResponse } from 'next/server'
import { getPhoto, updatePhotoComment, setPhotoDeleted } from '@/lib/db-d1'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { photoId, deleted } = await request.json()

    if (!photoId || typeof deleted !== 'boolean') {
      return NextResponse.json(
        { error: 'photoId and deleted flag are required' },
        { status: 400 }
      )
    }

    // Get current photo
    const photo = await getPhoto(photoId)
    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Update comment field with deletion flag
    const newComment = setPhotoDeleted(photo, deleted, photo.comment)
    await updatePhotoComment(photoId, newComment)

    return NextResponse.json({
      success: true,
      photoId,
      deleted
    })
  } catch (error) {
    console.error('Error toggling photo deletion:', error)
    return NextResponse.json(
      { error: 'Failed to toggle photo deletion' },
      { status: 500 }
    )
  }
}
