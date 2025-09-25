// Image service - supports both R2 and Cloudflare Images
import { uploadToR2, getPublicUrl as getR2PublicUrl } from './r2'
import { uploadToCloudflareImages, getImageUrl, getOriginalImageUrl, IMAGE_VARIANTS } from './cloudflare-images'

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
  options: ImageUploadOptions = {},
  photoId?: string
): Promise<ImageUrls> {
  const { service = 'r2', generateThumbnail = true } = options

  if (service === 'cloudflare-images') {
    if (!photoId) throw new Error('Photo ID required for Cloudflare Images')
    return uploadToCloudflareImagesService(file, photoId)
  } else {
    return uploadToR2Service(file, key, generateThumbnail)
  }
}

async function uploadToCloudflareImagesService(file: File, photoId: string): Promise<ImageUrls> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN
  const accountHash = process.env.CLOUDFLARE_IMAGES_HASH

  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Images credentials not configured')
  }

  // Use the photo ID as the custom ID to prevent duplicates
  const result = await uploadToCloudflareImages(file, accountId, apiToken, photoId)

  return {
    original: getImageUrl(result.id, IMAGE_VARIANTS.public, accountHash), // Public variant (original size, publicly accessible)
    thumbnail: getImageUrl(result.id, IMAGE_VARIANTS.thumbnail, accountHash), // 400x400 thumbnail
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

  // Upload original full-size image
  await uploadToR2(originalKey, buffer, file.type)

  // For R2, we'll rely on URL-based resizing instead of storing separate thumbnails
  // This saves storage space and the resizing happens on-demand
  const originalUrl = getR2PublicUrl(originalKey)

  return {
    original: originalUrl,
    thumbnail: originalUrl, // Same URL, resizing happens via URL parameters
  }
}

// URL transformation for both Cloudflare Images and R2 images
export function getResizedImageUrl(
  originalUrl: string,
  width?: number,
  height?: number,
  quality: number = 85
): string {
  // If it's a Cloudflare Images URL (imagedelivery.net), use variant system
  if (originalUrl.includes('imagedelivery.net')) {
    // For Cloudflare Images, we can't directly modify URLs, return as-is
    // The thumbnail URL should already be optimized
    return originalUrl
  }

  // For R2 images, try using Cloudflare Image Resizing
  if (originalUrl.includes('assets.timo.limo') || originalUrl.includes('r2.dev') || originalUrl.includes('r2.cloudflarestorage.com')) {
    // Option 1: Try URL-based resizing (requires Cloudflare Image Resizing enabled on your plan)
    const params = new URLSearchParams()
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    params.set('q', quality.toString())
    params.set('f', 'auto')
    params.set('fit', 'cover')

    const resizedUrl = `${originalUrl}?${params.toString()}`
    return resizedUrl
  }

  // Fallback for other URLs
  return originalUrl
}