# Error Monitoring & Logging Solutions for Cloudflare Pages

## 1. Sentry (Recommended)
Real-time error tracking with alerting.

### Setup:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Configure for Edge Runtime:
```javascript
// app/layout.tsx or app/error.tsx
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  edge: true, // Important for Cloudflare Pages
});
```

### Benefits:
- Real-time alerts (email, Slack, etc.)
- Error grouping & stack traces
- Performance monitoring
- User context tracking
- Free tier: 5K errors/month

## 2. Cloudflare Analytics Engine (Beta)
Native Cloudflare solution for custom metrics.

```javascript
// In your API routes
export async function POST(request: NextRequest) {
  try {
    // Your code
  } catch (error) {
    // Log to Analytics Engine
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        indexes: ["error"],
        blobs: [error.message, error.stack],
        doubles: [Date.now()],
      });
    }
    throw error;
  }
}
```

## 3. Logflare + Cloudflare Workers
Stream logs to Logflare (acquired by Supabase).

```javascript
// lib/logger.ts
export async function logError(error: Error, context: any) {
  await fetch('https://api.logflare.app/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.LOGFLARE_API_KEY,
    },
    body: JSON.stringify({
      message: error.message,
      metadata: {
        stack: error.stack,
        url: context.url,
        timestamp: new Date().toISOString(),
      }
    })
  });
}
```

## 4. Axiom
Modern observability platform with Cloudflare integration.

```bash
npm install @axiomhq/js
```

```javascript
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN,
  orgId: process.env.AXIOM_ORG_ID,
});

// Log errors
axiom.ingest('errors', {
  level: 'error',
  message: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});
```

## 5. Custom Solution: D1 + Email Alerts

```javascript
// Create errors table
CREATE TABLE errors (
  id TEXT PRIMARY KEY,
  message TEXT,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  timestamp INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

// Log errors to D1
async function logError(error, request) {
  await DB.prepare(`
    INSERT INTO errors (id, message, stack, url, user_agent, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    error.message,
    error.stack,
    request.url,
    request.headers.get('user-agent'),
    Date.now()
  ).run();

  // Send alert for critical errors
  if (error.critical) {
    await sendEmailAlert(error);
  }
}
```

## Quick Implementation for Your App

For immediate implementation in timo-limo, I recommend Sentry:

1. **Install**: `npm install @sentry/nextjs`
2. **Add to environment**: `NEXT_PUBLIC_SENTRY_DSN=your-dsn-here`
3. **Wrap your app** with error boundary
4. **Set up alerts** in Sentry dashboard

## Comparison

| Solution | Real-time Alerts | Free Tier | Setup Complexity | Best For |
|----------|-----------------|-----------|------------------|----------|
| Sentry | ✅ Instant | 5K/month | Easy | Production apps |
| Analytics Engine | ⚠️ Manual | Generous | Medium | Cloudflare native |
| Logflare | ✅ Configurable | 12.5M/month | Easy | High volume |
| Axiom | ✅ Instant | 0.5GB/month | Easy | Modern stack |
| Custom D1 | ⚠️ Build yourself | Unlimited | Hard | Full control |

## Recommended Setup for timo-limo

Use Sentry for errors + Cloudflare Analytics for metrics:
- Sentry catches JavaScript errors & API failures
- Analytics Engine tracks custom metrics (upload count, file sizes, etc.)
- Both integrate well with Cloudflare Pages