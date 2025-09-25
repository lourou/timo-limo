import { kv } from '@vercel/kv'

export interface PhotoBatch {
  id: string
  uploaderName: string
  comment?: string
  timestamp: number
}

export interface Photo {
  id: string
  batchId: string
  originalUrl: string
  thumbnailUrl: string
  uploaderName: string
  comment?: string
  uploadedAt: number
  order: number
}

export async function createBatch(batch: PhotoBatch): Promise<void> {
  await kv.hset(`batch:${batch.id}`, batch)
  await kv.zadd('batches', {
    score: batch.timestamp,
    member: batch.id
  })
}

export async function getBatch(batchId: string): Promise<PhotoBatch | null> {
  return await kv.hgetall(`batch:${batchId}`)
}

export async function addPhoto(photo: Photo): Promise<void> {
  await kv.hset(`photo:${photo.id}`, photo)
  await kv.zadd('photos', {
    score: photo.uploadedAt,
    member: photo.id
  })
  await kv.zadd(`batch:${photo.batchId}:photos`, {
    score: photo.order,
    member: photo.id
  })
}

export async function getPhoto(photoId: string): Promise<Photo | null> {
  return await kv.hgetall(`photo:${photoId}`)
}

export async function getRecentPhotos(limit: number = 50): Promise<Photo[]> {
  const photoIds = await kv.zrange('photos', 0, limit - 1, {
    rev: true
  })
  
  const photos: Photo[] = []
  for (const id of photoIds) {
    const photo = await getPhoto(id as string)
    if (photo) photos.push(photo)
  }
  
  return photos
}

export async function getBatchPhotos(batchId: string): Promise<Photo[]> {
  const photoIds = await kv.zrange(`batch:${batchId}:photos`, 0, -1)
  
  const photos: Photo[] = []
  for (const id of photoIds) {
    const photo = await getPhoto(id as string)
    if (photo) photos.push(photo)
  }
  
  return photos
}