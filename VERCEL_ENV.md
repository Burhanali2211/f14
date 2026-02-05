# Vercel Environment Variables

Add these environment variables in your Vercel project settings (Settings → Environment Variables).

## Required (existing)

| Name | Description | Example |
|------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `61fd1ff685c6e8a90c01f1cd02ed7677` |
| `R2_ACCESS_KEY_ID` | R2 API token Access Key ID (32 chars) | `9c49beb8...` |
| `R2_SECRET_ACCESS_KEY` | R2 API token Secret (64 chars) | `e5376fac...` |
| `R2_BUCKET_NAME` | R2 bucket name | `kalaam-reader` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `123456:ABC...` |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for notifications | `7658385347` |

## Optional (security & CORS)

| Name | Description | Example |
|------|-------------|---------|
| `TELEGRAM_WEBHOOK_SECRET` | Secret for telegram-notify endpoint (blocks spam) | `a1b2c3d4e5f6...` (32+ chars) |
| `VITE_TELEGRAM_WEBHOOK_SECRET` | Same value for client – must match server | Same as above |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `https://yourdomain.com,https://www.yourdomain.com` |
| `SITE_URL` | Production site URL | `https://yourdomain.com` |

## Vercel Dashboard – copy-paste format

```
TELEGRAM_WEBHOOK_SECRET=<generate 32+ char random string>
VITE_TELEGRAM_WEBHOOK_SECRET=<same value as TELEGRAM_WEBHOOK_SECRET>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SITE_URL=https://yourdomain.com
```

**Note:** Generate `TELEGRAM_WEBHOOK_SECRET` with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Environment scope

- **Production**: Set for Production
- **Preview**: Set for Preview if you want the same behavior in preview deployments
- **Development**: Optional for local Vercel dev
