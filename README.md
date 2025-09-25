# Timo Limo - Photo Upload & Live Preview App

A modern photo upload application with real-time preview, built with Next.js and deployed on Cloudflare Pages with D1 database and R2 storage.

## Features

- 📱 Mobile-optimized photo upload interface
- 🎬 Live preview page with animated photo drops
- 💾 Cloudflare R2 for image storage (cost-effective, no egress fees)
- 📄 Cloudflare D1 (SQLite) for metadata storage
- 🎨 Automatic image optimization and thumbnail generation
- 🔗 QR code for easy sharing
- 🍪 Cookie-based name persistence
- ⏱ Real-time updates via Server-Sent Events

## Setup Instructions

### 1. Clone and Install

```bash
git clone [your-repo]
cd timo-limo
npm install
```

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler auth login
```

### 3. Create Cloudflare Resources

#### Create D1 Database
```bash
wrangler d1 create timo-limo-db
```
Copy the database ID to your `wrangler.toml`

#### Create R2 Bucket
```bash
wrangler r2 bucket create timo-limo-photos
```

#### Set up Database Schema
```bash
wrangler d1 execute timo-limo-db --file=./schema.sql
```

### 4. Configure R2 Public Access

1. Go to R2 > your bucket > Settings
2. Create a Custom Domain or use R2.dev subdomain
3. Update `R2_PUBLIC_URL` in your environment

### 5. Environment Variables

Update `wrangler.toml` with your actual values:
- Replace `your-database-id-here` with your D1 database ID
- Update bucket names and public URLs

For local development, create `.env.local`:
```bash
cp .env.local.example .env.local
```

### 6. Run Development Server

```bash
npm run dev
```

For Cloudflare Pages preview:
```bash
npm run preview
```

Visit:
- Upload: http://localhost:3000/upload
- Preview: http://localhost:3000/preview

## Deployment to Cloudflare Pages

### Option 1: Wrangler CLI
```bash
npm run deploy
```

### Option 2: GitHub Integration
1. Push your code to GitHub
2. Go to Cloudflare Dashboard > Pages
3. Connect your GitHub repository
4. Set build command: `npm run build`
5. Set output directory: `.vercel/output/static`

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
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Real-time**: Server-Sent Events
- **Image Processing**: Sharp for optimization

## Cost Optimization

- **Cloudflare Pages**: Free for personal use
- **Cloudflare D1**: Free tier: 5GB storage, 25M row reads/day
- **Cloudflare R2**: $0.015/GB stored, no egress fees
- **Total**: **Free** for moderate usage, ~$2-5/month at scale

## License

MIT