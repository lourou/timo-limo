import { NextRequest, NextResponse } from 'next/server'
import { createBatch, PhotoBatch } from '@/lib/db-d1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batchId, uploaderName, comment } = body

    if (!batchId || !uploaderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const batch: PhotoBatch = {
      id: batchId,
      uploaderName,
      comment,
      timestamp: Date.now(),
    }

    await createBatch(batch)

    return NextResponse.json({ success: true, batch })
  } catch (error) {
    console.error('Batch creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    )
  }
}