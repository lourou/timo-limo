# Timo Limo - Photo Upload & Live Preview App

A modern photo upload application with real-time preview, built with Next.js, Vercel, and Cloudflare R2.

## Features

- 📱 Mobile-optimized photo upload interface
- 🎬 Live preview page with animated photo drops
- 💾 Cloudflare R2 for storage (cost-effective, no egress fees)
- 🚀 Vercel KV for metadata storage
- 🎨 Automatic image optimization and thumbnail generation
- 🔗 QR code for easy sharing
- 🍪 Cookie-based name persistence
- ⏱ Real-time updates via Server-Sent Events

## Setup Instructions

### 1. Clone and Install

```bash
git clone [your-repo]
cd timo-limo
yarn install
```

### 2. Configure Cloudflare R2

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to R2 > Create Bucket
3. Name your bucket (e.g., `timo-limo-photos`)
4. Go to Settings > Domain Access > Connect Domain
5. Add a public domain for your bucket
6. Create API tokens:
   - Go to R2 > Manage R2 API tokens
   - Create a new API token with Object Read & Write permissions
   - Save the credentials

### 3. Configure Vercel KV

1. In your [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to Storage > Create Database > KV
3. Name it (e.g., `timo-limo-kv`)
4. Copy the environment variables provided

### 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=timo-limo-photos
R2_PUBLIC_URL=https://photos.yourdomain.com

# Vercel KV
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

### 5. Run Development Server

```bash
yarn dev
```

Visit:
- Upload: http://localhost:3000/upload
- Preview: http://localhost:3000/preview

## Deployment to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy!

## Usage

1. **Upload Page** (`/upload`):
   - Enter your name (saved in cookie)
   - Add optional comment
   - Select multiple photos
   - Click upload

2. **Preview Page** (`/preview`):
   - Shows live photo stream
   - QR code for sharing upload link
   - Animated photo drops
   - Shows uploader name and comments

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Storage**: Cloudflare R2 (S3-compatible)
- **Database**: Vercel KV (Redis)
- **Real-time**: Server-Sent Events
- **Image Processing**: Sharp for optimization
- **Hosting**: Vercel

## Cost Optimization

- **Cloudflare R2**: $0.015/GB stored, no egress fees
- **Vercel KV**: Free tier includes 30k requests/month
- **Vercel Hosting**: Free tier for personal use
- **Total**: ~$5-10/month for moderate usage

## License

MIT