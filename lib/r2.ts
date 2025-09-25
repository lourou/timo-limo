// Access R2 from the runtime environment
function getR2(): R2Bucket {
  // In Edge Runtime, bindings are available on process.env
  if (typeof process !== 'undefined' && (process.env as any).R2) {
    return (process.env as any).R2
  }

  // Fallback to global (production deployment)
  const globalR2 = (globalThis as any).R2
  if (globalR2) {
    return globalR2
  }

  throw new Error('R2 bucket not available. Make sure bindings are configured in wrangler.toml')
}

function getPublicUrlBase(): string {
  return process.env.R2_PUBLIC_URL || 'https://your-bucket.r2.dev'
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const R2 = getR2()

  await R2.put(key, body, {
    httpMetadata: {
      contentType: contentType,
    },
  })

  return `${getPublicUrlBase()}/${key}`
}

export function getPublicUrl(key?: string): string {
  const baseUrl = getPublicUrlBase()
  return key ? `${baseUrl}/${key}` : baseUrl
}