import { NextRequest, NextResponse } from 'next/server'
import { getRecentPhotos, getTotalPhotoCount } from '@/lib/db-d1'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')

    const photos = await getRecentPhotos(limit)
    const totalCount = await getTotalPhotoCount()

    return NextResponse.json({
      photos,
      totalCount,
      success: true
    })
  } catch (error) {
    console.error('Photos API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos', photos: [], totalCount: 0 },
      { status: 500 }
    )
  }
}