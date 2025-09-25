import sharp from 'sharp'

export async function optimizeImage(
  buffer: Buffer,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'jpeg' | 'png' | 'webp'
  } = {}
): Promise<Buffer> {
  const { width = 1920, height, quality = 85, format = 'jpeg' } = options

  let pipeline = sharp(buffer)

  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, progressive: true })
      break
    case 'png':
      pipeline = pipeline.png({ quality, progressive: true })
      break
    case 'webp':
      pipeline = pipeline.webp({ quality })
      break
  }

  return await pipeline.toBuffer()
}

export async function createThumbnail(
  buffer: Buffer,
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer()
}

export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata()
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: metadata.size,
  }
}