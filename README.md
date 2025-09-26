# Timo Limo - Photo Upload & Live Preview App

A modern photo upload application with real-time preview, built with Next.js and deployed on Cloudflare Pages.

## Features

- 📱 Mobile-optimized photo upload interface
- 🎬 Live preview page with animated photo drops
- 🖼️ Cloudflare Images for storage & optimization (recommended)
- 💾 Cloudflare R2 fallback storage option
- 📄 Cloudflare D1 (SQLite) for metadata
- 🎨 Automatic thumbnail generation & variants
- 🔗 QR code for easy sharing
- 🍪 Cookie-based name persistence
- ⏱ Real-time updates via Server-Sent Events
- 📝 Original filename preservation

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
npx wrangler d1 create timo-limo-db
```
This will output a database ID. Copy it to your `wrangler.toml`

#### Create Storage (Choose One)

**Option A: Cloudflare Images (Recommended)**
- Go to Cloudflare Dashboard > Images
- Enable Cloudflare Images
- Get your API token and account hash
- Add to environment variables

**Option B: R2 Bucket**
```bash
npx wrangler r2 bucket create timo-limo-photos
```

#### Set up Database Schema
```bash
# Apply to local development database
npx wrangler d1 execute your-database-name --file=./schema.sql

# Apply to remote production database
npx wrangler d1 execute your-database-name --file=./schema.sql --remote
```

#### Verify Database Setup
```bash
# List your databases
npx wrangler d1 list

# Test connection and see tables
npx wrangler d1 execute your-database-name --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
```

### 4. Configure R2 Public Access

1. Go to Cloudflare Dashboard > R2 > your bucket > Settings
2. Create a Custom Domain or use R2.dev subdomain
3. Update `R2_PUBLIC_URL` in your `wrangler.toml`

### 5. Update Configuration

#### Update wrangler.toml
Replace the database_id with your actual D1 database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "your-database-name"
database_id = "your-actual-database-id"
```

#### Environment Variables (Optional)
For local development with environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

### 6. Development

#### Standard Next.js Development (Fast UI iteration)
```bash
npm run dev
```
- Fast hot reload and debugging
- API routes won't work (no D1/R2 bindings)
- Best for UI/frontend development

#### Cloudflare Pages Development (Full stack testing)
```bash
npm run dev:cf
```
- Full Cloudflare bindings (D1 database, R2 storage)
- Edge Runtime environment
- Slower but works with all features
- Use this to test API routes and database

#### Quick Preview
```bash
npm run preview
```

Visit:
- Upload: http://localhost:8788/upload (Cloudflare dev) or http://localhost:3000/upload (Next.js dev)
- Preview: http://localhost:8788/preview (Cloudflare dev) or http://localhost:3000/preview (Next.js dev)

## Deployment to Cloudflare Pages

### Option 1: Wrangler CLI
```bash
npm run deploy
```
This builds and deploys to your Cloudflare Pages project

### Option 2: GitHub Integration
1. Push your code to GitHub
2. Go to Cloudflare Dashboard > Pages
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `npm run build:cf`
   - **Build output directory:** `.vercel/output/static`
   - **Environment variables:** Add any needed vars
5. Deploy!

## Database Management

### Available Scripts

```bash
# Development
npm run dev          # Standard Next.js dev (fast, no DB/storage)
npm run dev:cf       # Cloudflare Pages dev (full features)
npm run preview      # Same as dev:cf

# Building
npm run build        # Standard Next.js build
npm run build:cf     # Build for Cloudflare Pages

# Deployment
npm run deploy       # Build and deploy to Cloudflare Pages

# Database
npm run db:create    # Create D1 database
npm run db:schema    # Apply schema to local database
npm run db:schema:remote # Apply schema to remote database
npm run cf-typegen   # Generate Cloudflare types
```

### Useful D1 Commands
```bash
# List all databases
npx wrangler d1 list

# Execute SQL commands
npx wrangler d1 execute DB_NAME --command="SELECT * FROM photos LIMIT 5;" --remote

# Backup database
npx wrangler d1 export DB_NAME --output=backup.sql

# View database info
npx wrangler d1 info DB_NAME
```

### Database Access Control
- **You** (account owner) have full access
- **Cloudflare Pages** automatically gets access via DB binding
- **Team members** you invite to your Cloudflare account
- **API tokens** can be created for external access if needed

## Development Workflow

1. **UI Development**: Use `npm run dev` for fast iteration
2. **API Testing**: Use `npm run dev:cf` to test with real D1/R2 bindings
3. **Final Testing**: Use `npm run preview` before deployment
4. **Deploy**: Use `npm run deploy` to publish to Cloudflare Pages

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

- **Frontend**: Next.js 15 with App Router
- **Hosting**: Cloudflare Pages (Edge Runtime)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare Images (primary) / R2 (fallback)
- **Real-time**: Server-Sent Events
- **Image Processing**: Canvas API (client-side) + Cloudflare transforms


## License

MIT