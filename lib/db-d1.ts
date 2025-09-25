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

// This will be available in the Cloudflare Workers environment
declare global {
  const DB: D1Database
}

export async function createBatch(batch: PhotoBatch): Promise<void> {
  await DB.prepare(`
    INSERT INTO batches (id, uploader_name, comment, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(batch.id, batch.uploaderName, batch.comment, batch.timestamp).run()
}

export async function getBatch(batchId: string): Promise<PhotoBatch | null> {
  const result = await DB.prepare(`
    SELECT id, uploader_name as uploaderName, comment, timestamp
    FROM batches WHERE id = ?
  `).bind(batchId).first()
  
  return result as PhotoBatch | null
}

export async function addPhoto(photo: Photo): Promise<void> {
  await DB.prepare(`
    INSERT INTO photos (id, batch_id, original_url, thumbnail_url, uploader_name, comment, uploaded_at, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    photo.id,
    photo.batchId,
    photo.originalUrl,
    photo.thumbnailUrl,
    photo.uploaderName,
    photo.comment,
    photo.uploadedAt,
    photo.order
  ).run()
}

export async function getPhoto(photoId: string): Promise<Photo | null> {
  const result = await DB.prepare(`
    SELECT 
      id,
      batch_id as batchId,
      original_url as originalUrl,
      thumbnail_url as thumbnailUrl,
      uploader_name as uploaderName,
      comment,
      uploaded_at as uploadedAt,
      order_index as "order"
    FROM photos WHERE id = ?
  `).bind(photoId).first()
  
  return result as Photo | null
}

export async function getRecentPhotos(limit: number = 50): Promise<Photo[]> {
  const results = await DB.prepare(`
    SELECT 
      id,
      batch_id as batchId,
      original_url as originalUrl,
      thumbnail_url as thumbnailUrl,
      uploader_name as uploaderName,
      comment,
      uploaded_at as uploadedAt,
      order_index as "order"
    FROM photos 
    ORDER BY uploaded_at DESC 
    LIMIT ?
  `).bind(limit).all()
  
  return results.results as Photo[]
}

export async function getBatchPhotos(batchId: string): Promise<Photo[]> {
  const results = await DB.prepare(`
    SELECT 
      id,
      batch_id as batchId,
      original_url as originalUrl,
      thumbnail_url as thumbnailUrl,
      uploader_name as uploaderName,
      comment,
      uploaded_at as uploadedAt,
      order_index as "order"
    FROM photos 
    WHERE batch_id = ?
    ORDER BY order_index ASC
  `).bind(batchId).all()
  
  return results.results as Photo[]
}