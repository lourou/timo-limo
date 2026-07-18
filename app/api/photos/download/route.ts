import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

// Proxies the ORIGINAL uploaded image from Cloudflare Images.
// The public/thumbnail variants are resized/re-encoded, so the export uses
// the /blob endpoint which returns the original bytes exactly as uploaded.
// https://developers.cloudflare.com/images/manage-images/export-images/
export async function GET(request: NextRequest) {
  try {
    const imageId = request.nextUrl.searchParams.get('id')

    if (!imageId) {
      return NextResponse.json({ error: 'Missing image id' }, { status: 400 })
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Cloudflare Images not configured' },
        { status: 500 }
      )
    }

    // IMAGE_ID must be fully URL encoded in the API call URL.
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${encodeURIComponent(imageId)}/blob`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    )

    if (!cfResponse.ok) {
      const body = await cfResponse.text()
      console.error('Cloudflare Images blob fetch error:', {
        status: cfResponse.status,
        imageId,
        body,
      })
      return NextResponse.json(
        { error: 'Failed to fetch original image' },
        { status: 502 }
      )
    }

    // Stream the original bytes straight back to the client.
    const contentType = cfResponse.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(cfResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error downloading original image:', error)
    return NextResponse.json(
      { error: 'Failed to download original image' },
      { status: 500 }
    )
  }
}
