import { NextRequest, NextResponse } from 'next/server'
import { createBatch, getBatch, PhotoBatch } from '@/lib/db-d1'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      batchId: string
      uploaderName: string
      comment?: string
    }
    const { batchId, uploaderName, comment } = body

    if (!batchId || !uploaderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // First, check if batch already exists - idempotent!
    const existingBatch = await getBatch(batchId)
    if (existingBatch) {
      console.log('Batch already exists, reusing:', batchId)
      // Return success with existing batch - totally fine!
      return NextResponse.json({
        success: true,
        batch: existingBatch,
        existing: true
      })
    }

    // Create new batch
    const batch: PhotoBatch = {
      id: batchId,
      uploaderName,
      comment: comment || undefined,
      timestamp: Date.now(),
    }

    console.log('Creating new batch:', batchId)
    await createBatch(batch)

    return NextResponse.json({
      success: true,
      batch
    })
  } catch (error) {
    console.error('Batch creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}