# R2 CORS Setup for Large File Uploads

Audio uploads **under 4MB** use a proxy and work without CORS. For **files over 4MB**, the browser uploads directly to R2, which requires CORS to be configured on your bucket.

## When to Configure CORS

- Uploads **under 4MB**: No action needed (proxy upload)
- Uploads **over 4MB**: Configure CORS on your R2 bucket

## Local Network Access (192.168.x.x)

If uploads work on `localhost:8080` but **fail when accessing via your local IP** (e.g. `http://192.168.31.96:8080`), the R2 bucket CORS must include that origin. R2 does not support wildcards for origins—each must be listed explicitly.

1. Edit `scripts/r2-cors.json` and add your origin, e.g. `http://192.168.31.96:8080`
2. Re-apply CORS (see Option 2 below)
3. If your IP changes (DHCP), repeat with the new IP

## How to Configure CORS

### Option 1: Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → your bucket
2. Open **Settings** → **CORS policy**
3. Add origins for production, localhost, and your local network IP (e.g. `http://192.168.31.96:8080`)
4. Save

### Option 2: Wrangler CLI

1. Edit `scripts/r2-cors.json` to add your domains and local IP origins
2. Run:

```bash
wrangler r2 bucket cors put kalaam-reader --file scripts/r2-cors.json
```

Replace `kalaam-reader` with your bucket name.

## Verify

After configuring CORS, large file uploads (over 4MB) should work. Small files (under 4MB) work without CORS via the proxy.

## Troubleshooting 401 Unauthorized

If you see **401 Unauthorized** or **CORS header missing** (which often masks a 401), the issue is usually **R2 credentials**, not CORS:

1. **Access Key ID**: Must be exactly **32 characters**. When creating an R2 API token, copy the **Access Key ID** field, NOT the "Token Value" (40 chars).
2. **Secret Access Key**: Must be exactly **64 characters**.
3. **Vercel env vars**: Ensure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` are set in Vercel → Project → Settings → Environment Variables.
4. **Regenerate token**: If unsure, create a new R2 API token at [Cloudflare R2 API Tokens](https://dash.cloudflare.com/?to=/:account/r2/api-tokens) with Object Read & Write permissions.
