# Vercel Environment Variables

Add these environment variables in your Vercel project settings (Settings → Environment Variables).

## Copy-paste block for Vercel

1. Run: `node scripts/generate-vercel-env.js`
2. Open **`vercel-env-paste.txt`** (project root, gitignored)
3. Copy the entire contents and paste into **Vercel → Project → Settings → Environment Variables → Bulk Edit**

## Variable reference

| Name | Description |
|------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 API Access Key ID (32 chars) |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret (64 chars) |
| `R2_BUCKET_NAME` | R2 bucket name |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |
| `TELEGRAM_WEBHOOK_SECRET` | Secret for telegram-notify (blocks spam) |
| `VITE_TELEGRAM_WEBHOOK_SECRET` | Same value for client |
| `VITE_TELEGRAM_CHAT_ID` | Same as TELEGRAM_CHAT_ID (client-side) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `SITE_URL` | Production site URL |
| `VITE_EARNINGS_ACCESS_PASSWORD` | Admin earnings section password |
| `VITE_VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VITE_AIRSEND_TURN_URL` | (Optional) TURN server URL for WebRTC (e.g. `turn:turn.example.com:3478`) |
| `VITE_AIRSEND_TURN_USER` | (Optional) TURN username |
| `VITE_AIRSEND_TURN_CRED` | (Optional) TURN credential |

## Environment scope

- **Production**: Set all for Production
- **Preview**: Copy same block for Preview deployments
