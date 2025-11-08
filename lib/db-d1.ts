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
  originalFilename?: string
}

// Deletion flag stored in comment field
const DELETED_FLAG = '__DELETED__'

export function isPhotoDeleted(photo: Photo): boolean {
  return photo.comment?.startsWith(DELETED_FLAG) || false
}

export function getPhotoComment(photo: Photo): string | undefined {
  if (!photo.comment) return undefined
  if (photo.comment.startsWith(DELETED_FLAG)) {
    return photo.comment.substring(DELETED_FLAG.length)
  }
  return photo.comment
}

export function setPhotoDeleted(photo: Photo, deleted: boolean, originalComment?: string): string | null {
  if (deleted) {
    const comment = originalComment || photo.comment || ''
    return `${DELETED_FLAG}${comment}`
  }
  return originalComment || null
}

// Get DB from Cloudflare Workers environment
function getDB(): D1Database {
  // In Edge Runtime, bindings are available on process.env
  if (typeof process !== 'undefined' && (process.env as any).DB) {
    return (process.env as any).DB
  }

  // Fallback to global (production deployment)
  const globalDB = (globalThis as any).DB
  if (globalDB) {
    return globalDB
  }

  throw new Error('D1 database not available. Make sure bindings are configured in wrangler.toml')
}

export async function createBatch(batch: PhotoBatch): Promise<void> {
  const DB = getDB()
  await DB.prepare(`
    INSERT INTO batches (id, uploader_name, comment, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(
    batch.id,
    batch.uploaderName,
    batch.comment || null,
    batch.timestamp
  ).run()
}

export async function getBatch(batchId: string): Promise<PhotoBatch | null> {
  const DB = getDB()
  const result = await DB.prepare(`
    SELECT id, uploader_name as uploaderName, comment, timestamp
    FROM batches WHERE id = ?
  `).bind(batchId).first()

  if (!result) return null
  return result as unknown as PhotoBatch
}

export async function addPhoto(photo: Photo): Promise<void> {
  const DB = getDB()
  await DB.prepare(`
    INSERT INTO photos (id, batch_id, original_url, thumbnail_url, uploader_name, comment, uploaded_at, order_index, original_filename)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    photo.id,
    photo.batchId,
    photo.originalUrl,
    photo.thumbnailUrl,
    photo.uploaderName,
    photo.comment || null,
    photo.uploadedAt,
    photo.order,
    photo.originalFilename || null
  ).run()
}

export async function getPhoto(photoId: string): Promise<Photo | null> {
  const DB = getDB()
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

  if (!result) return null
  return result as unknown as Photo
}

export async function getRecentPhotos(limit: number = 50, includeDeleted: boolean = false): Promise<Photo[]> {
  const DB = getDB()
  const query = includeDeleted
    ? `
      SELECT
        id,
        batch_id as batchId,
        original_url as originalUrl,
        thumbnail_url as thumbnailUrl,
        uploader_name as uploaderName,
        comment,
        uploaded_at as uploadedAt,
        order_index as "order",
        original_filename as originalFilename
      FROM photos
      ORDER BY uploaded_at DESC
      LIMIT ?
    `
    : `
      SELECT
        id,
        batch_id as batchId,
        original_url as originalUrl,
        thumbnail_url as thumbnailUrl,
        uploader_name as uploaderName,
        comment,
        uploaded_at as uploadedAt,
        order_index as "order",
        original_filename as originalFilename
      FROM photos
      WHERE comment IS NULL OR comment NOT LIKE '${DELETED_FLAG}%'
      ORDER BY uploaded_at DESC
      LIMIT ?
    `

  const results = await DB.prepare(query).bind(limit).all()
  return results.results as unknown as Photo[]
}

export async function getTotalPhotoCount(includeDeleted: boolean = false): Promise<number> {
  const DB = getDB()
  const query = includeDeleted
    ? `SELECT COUNT(*) as count FROM photos`
    : `SELECT COUNT(*) as count FROM photos WHERE comment IS NULL OR comment NOT LIKE '${DELETED_FLAG}%'`

  const result = await DB.prepare(query).first()
  return (result as any)?.count || 0
}

export async function getBatchPhotos(batchId: string, includeDeleted: boolean = false): Promise<Photo[]> {
  const DB = getDB()
  const query = includeDeleted
    ? `
      SELECT
        id,
        batch_id as batchId,
        original_url as originalUrl,
        thumbnail_url as thumbnailUrl,
        uploader_name as uploaderName,
        comment,
        uploaded_at as uploadedAt,
        order_index as "order",
        original_filename as originalFilename
      FROM photos
      WHERE batch_id = ?
      ORDER BY order_index ASC
    `
    : `
      SELECT
        id,
        batch_id as batchId,
        original_url as originalUrl,
        thumbnail_url as thumbnailUrl,
        uploader_name as uploaderName,
        comment,
        uploaded_at as uploadedAt,
        order_index as "order",
        original_filename as originalFilename
      FROM photos
      WHERE batch_id = ? AND (comment IS NULL OR comment NOT LIKE '${DELETED_FLAG}%')
      ORDER BY order_index ASC
    `

  const results = await DB.prepare(query).bind(batchId).all()
  return results.results as unknown as Photo[]
}

export async function updatePhotoComment(photoId: string, comment: string | null): Promise<void> {
  const DB = getDB()
  await DB.prepare(`
    UPDATE photos
    SET comment = ?
    WHERE id = ?
  `).bind(comment, photoId).run()
}

export async function getAllBatches(): Promise<PhotoBatch[]> {
  const DB = getDB()
  const results = await DB.prepare(`
    SELECT id, uploader_name as uploaderName, comment, timestamp
    FROM batches
    ORDER BY timestamp DESC
  `).all()

  return results.results as unknown as PhotoBatch[]
}