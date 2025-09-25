// Cloudflare Images API integration
// https://developers.cloudflare.com/images/

export interface ImageUploadResult {
  id: string
  filename: string
  uploaded: string
  requireSignedURLs: boolean
  variants: string[]
}

interface CloudflareImagesResponse {
  result: ImageUploadResult
  success: boolean
  errors: any[]
  messages: any[]
}

export async function uploadToCloudflareImages(
  file: File,
  accountId: string,
  apiToken: string
): Promise<ImageUploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to upload to Cloudflare Images: ${response.statusText}`)
  }

  const result = await response.json() as CloudflareImagesResponse

  if (!result.success) {
    throw new Error(`Cloudflare Images API error: ${JSON.stringify(result.errors)}`)
  }

  return result.result
}

export function getImageUrl(
  imageId: string,
  variant: string = 'public',
  accountHash?: string
): string {
  if (accountHash) {
    return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`
  }
  // Fallback to direct API URL (requires signed URLs)
  return `https://api.cloudflare.com/client/v4/accounts/images/v1/${imageId}/${variant}`
}

// Image variants for different sizes
export const IMAGE_VARIANTS = {
  thumbnail: 'thumbnail', // 200x200
  medium: 'medium',       // 800x600
  large: 'large',         // 1200x900
  public: 'public'        // Original size
} as const

export type ImageVariant = typeof IMAGE_VARIANTS[keyof typeof IMAGE_VARIANTS]