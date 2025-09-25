// Image service - supports both R2 and Cloudflare Images
import { uploadToR2, getPublicUrl as getR2PublicUrl } from './r2'
import { uploadToCloudflareImages, getImageUrl, IMAGE_VARIANTS } from './cloudflare-images'

export type ImageService = 'r2' | 'cloudflare-images'

export interface ImageUploadOptions {
  service?: ImageService
  generateThumbnail?: boolean
}

export interface ImageUrls {
  original: string
  thumbnail: string
}

export async function uploadImage(
  file: File,
  key: string,
  options: ImageUploadOptions = {}
): Promise<ImageUrls> {
  const { service = 'r2', generateThumbnail = true } = options

  if (service === 'cloudflare-images') {
    return uploadToCloudflareImagesService(file)
  } else {
    return uploadToR2Service(file, key, generateThumbnail)
  }
}

async function uploadToCloudflareImagesService(file: File): Promise<ImageUrls> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_IMAGES_HASH

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images credentials not configured')
  }

  const result = await uploadToCloudflareImages(file, accountId, apiToken)

  return {
    original: getImageUrl(result.id, IMAGE_VARIANTS.public, accountHash),
    thumbnail: getImageUrl(result.id, IMAGE_VARIANTS.thumbnail, accountHash),
  }
}

async function uploadToR2Service(
  file: File,
  key: string,
  generateThumbnail: boolean
): Promise<ImageUrls> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileExtension = file.name.split('.').pop()

  const originalKey = `${key}.${fileExtension}`
  const thumbnailKey = generateThumbnail ? `thumbnails/${key}.${fileExtension}` : originalKey

  // Upload original
  await uploadToR2(originalKey, buffer, file.type)

  // For now, use same file for thumbnail (Cloudflare can resize on-demand)
  if (generateThumbnail) {
    await uploadToR2(thumbnailKey, buffer, file.type)
  }

  return {
    original: getR2PublicUrl(originalKey),
    thumbnail: getR2PublicUrl(thumbnailKey),
  }
}

// URL transformation for R2 images using Cloudflare Image Resizing
export function getResizedImageUrl(
  originalUrl: string,
  width?: number,
  height?: number,
  quality: number = 85
): string {
  if (!originalUrl.includes('assets.timo.limo')) {
    return originalUrl
  }

  const params = new URLSearchParams()
  if (width) params.set('width', width.toString())
  if (height) params.set('height', height.toString())
  params.set('quality', quality.toString())
  params.set('format', 'auto') // Auto WebP/AVIF

  return `${originalUrl}?${params.toString()}`
}