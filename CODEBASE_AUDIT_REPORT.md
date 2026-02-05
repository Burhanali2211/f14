# Comprehensive Codebase Audit Report
**Project:** Sacred Recitations Hub (Followers of 14)  
**Date:** February 5, 2025  
**Scope:** Full codebase analysis without relying on documentation

---

## Executive Summary

This audit identified **critical**, **high**, and **medium** priority issues across configuration, routing, logic, security, dead code, and structural consistency. The build succeeds, but several issues could cause runtime failures, SEO problems, or security vulnerabilities in production.

---

## CRITICAL ISSUES

### 1. **Exposed Secrets in Repository**
**Location:** `docs/vercel-env-paste.txt`

**Issue:** Real API keys, tokens, and credentials are committed to the repository:
- Supabase URL, anon key, service role key
- R2 account credentials (access key, secret)
- Telegram bot token and chat ID
- VAPID public key
- Webhook secrets

**Impact:** Anyone with repo access can compromise your Supabase, R2, and Telegram integrations.

**Fix:** 
- Delete `docs/vercel-env-paste.txt` and add to `.gitignore`
- Rotate ALL exposed credentials immediately
- Use environment variables only; never commit secrets

---

### 2. **BackendHealthCheck Logic Bug**
**Location:** `src/App.tsx` (lines 98–116)

**Issue:** Uses `testLogin("healthcheck@example.com", "invalid-password")` to check backend reachability. Login with invalid credentials **always fails** (auth error). The catch block shows "Backend unreachable" toast on **any** error—including when the backend is reachable but returns "invalid credentials."

**Result:** Users see "Backend unreachable" on every page load, even when the backend is fine.

**Fix:** Use `testConnection()` from `auth-utils.ts` (OPTIONS request) instead of `testLogin`. Only show toast when `testConnection()` returns `false`.

---

### 3. **Route Mismatch: `/ahlulbayt` vs `/ahlul-bayt`**
**Locations:**
- `index.html` (noscript link): `/ahlulbayt` ❌
- `api/sitemap.ts` (static pages): `/ahlulbayt` ❌
- `public/robots.txt` (Allow): `/ahlulbayt` ❌
- **Actual route:** `/ahlul-bayt` (with hyphen) ✅

**Impact:** 
- Noscript users get 404
- Sitemap sends crawlers to non-existent URL
- robots.txt allows wrong path

**Fix:** Change all instances to `/ahlul-bayt`.

---

### 4. **Artist URL Inconsistency: Slug vs Name**
**Locations:**
- `api/sitemap.ts`: Uses `artist.slug` → `/artist/nadeem-sarwar`
- `src/components/sections/ArtistsSection.tsx`: Uses `artist.name` → `/artist/Nadeem%20Sarwar`
- `src/pages/ArtistPage.tsx`: Expects `reciterName` (name), queries `.eq('name', decodedName)`

**Impact:** Sitemap URLs like `/artist/nadeem-sarwar` may 404 if the app only supports name-based URLs. Crawlers get broken links.

**Fix:** Either:
- Use `slug` everywhere (ArtistPage, ArtistsSection, sitemap), or
- Use `name` everywhere. Currently the app uses **name**; sitemap should use `artist.name` (URL-encoded) to match.

---

### 5. **Missing Artist OG Tags in og-redirect**
**Location:** `api/og-redirect.ts`

**Issue:** Handles `/piece/:id`, `/category/:slug`, `/figure/:slug` but **not** `/artist/:reciterName`. Vercel rewrites bot requests for `/artist/:slug` to this API, but the handler has no `artistMatch`—so artist pages get default OG tags instead of piece-specific metadata.

**Fix:** Add `artistMatch` and fetch artist data for OG meta when path matches `/artist/:slug` or `/artist/:name`.

---

### 6. **Custom Service Worker Overwritten in Production**
**Locations:** `public/sw.js` vs Vite PWA output

**Issue:** `public/sw.js` contains custom logic (IndexedDB version storage, push notifications, APP_UPDATE_AVAILABLE, SUBSCRIBE_NOTIFICATIONS). The Vite PWA plugin uses `generateSW` and writes its own `dist/sw.js`, which **overwrites** the custom SW.

**Result:** 
- Custom SW logic is **dead in production**
- `use-service-worker-messages.ts` handlers for `APP_VERSION_CHECK`, `SUBSCRIBE_NOTIFICATIONS`, etc. never receive messages
- Update detection still works via `UpdateNotification` (version.json fetch), but SW-based flows do not

**Fix:** Use Vite PWA `injectManifest` strategy with `public/sw.js` as the base, or move custom logic into workbox lifecycle hooks.

---

## HIGH PRIORITY ISSUES

### 7. **Duplicate PostCSS Config**
**Locations:** `postcss.config.cjs` and `postcss.config.js`

**Issue:** Both exist with identical content. Vite uses `postcss.config.js`. The `.cjs` file is redundant and can cause confusion.

**Fix:** Remove `postcss.config.cjs`.

---

### 8. **Duplicate Scripts**
**Locations:** `scripts/update-calendar-events.ts` and `scripts/update-calendar-events.js`

**Issue:** Same logic in both files. One is effectively dead.

**Fix:** Keep one (e.g. `.ts`), remove the other, and ensure `package.json` or docs reference the correct script.

---

### 9. **Missing Image Asset**
**Location:** `src/pages/SiteSettingsPage.tsx` line 374

**Issue:** `placeholder="/hero-image.jpg"` but `hero-image.jpg` does not exist in `public/`.

**Fix:** Use an existing asset (e.g. `/main.png` or `/placeholder.svg`) or add `hero-image.jpg`.

---

### 10. **CommonJS `require` in ESM Module**
**Location:** `src/lib/auth-utils.ts` line 321

**Issue:** `const { clearProfileCache } = require('./user-role');` in an ESM/TS file. Can cause bundling or runtime issues.

**Fix:** Use dynamic import: `const { clearProfileCache } = await import('./user-role');` (with `await` in async context).

---

### 11. **Hardcoded Supabase URL**
**Locations:** 
- `vite.config.ts` (html-env-transform)
- `index.html` (preconnect, dns-prefetch)

**Issue:** Hardcoded `https://ysacmemkrnmczmtkfqad.supabase.co`. Reduces flexibility for staging/other environments.

**Fix:** Use `VITE_SUPABASE_URL` from env in build and at runtime where possible.

---

### 12. **Typo in ALLOWED_ORIGINS**
**Location:** `docs/vercel-env-paste.txt` (and any env that copies it)

**Issue:** `https://followerof14.vercel.app` (missing `s`) — should be `followersof14`.

**Fix:** Correct to `https://followersof14.vercel.app`.

---

## MEDIUM PRIORITY ISSUES

### 13. **Dead Code in main.tsx**
**Locations:** `src/main.tsx`

- `getZoomLevel()` (lines 69–107): Defined but never called
- `checkViewportMismatch()` (lines 255–259): Defined but never called
- `handleViewportChange` (lines 216–224): Empty body, does nothing

**Fix:** Remove or implement; otherwise they add noise and potential confusion.

---

### 14. **Loose TypeScript Settings**
**Location:** `tsconfig.json`

**Issue:** `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false` — weak type safety.

**Fix:** Gradually enable `strictNullChecks` and `noImplicitAny` to catch more bugs at compile time.

---

### 15. **Vercel API Env Vars**
**Locations:** `api/sitemap.ts`, `api/og-redirect.ts`

**Issue:** Use `process.env.VITE_SUPABASE_PUBLISHABLE_KEY`. Vercel may not expose `VITE_*` to serverless by default (they’re often client-only).

**Fix:** Ensure these vars are set in Vercel project settings for serverless, or use non-prefixed names (e.g. `SUPABASE_ANON_KEY`) for API routes.

---

### 16. **Sitemap Route Mismatch**
**Location:** `api/sitemap.ts` line 61

**Issue:** Static page uses `/ahlulbayt`; should be `/ahlul-bayt` (see Critical #3).

---

### 17. **Netlify _redirects vs Vercel**
**Location:** `public/_redirects`

**Issue:** Contains `/* /index.html 200` (Netlify-style). Project uses Vercel; this file is unused on Vercel.

**Fix:** Remove if only deploying to Vercel, or keep for Netlify compatibility if needed.

---

## LOW PRIORITY / NOTES

### 18. **Manifest Search Shortcut**
**Location:** `public/manifest.json`

**Issue:** Shortcut URL `"/?search="` — search param is empty; may need to be handled by the app.

### 19. **IndexedDB Name Mismatch**
**Locations:** `public/sw.js` uses `sacred-recitations-v1`; `app-version.ts` references `app-version-db`. Different storage strategies; not necessarily wrong but worth documenting.

### 20. **Build Warnings**
**Issue:** Vite reports dynamic vs static import conflicts for `auth-utils`, `app-version`, `data-cache`. These affect chunking, not correctness.

---

## Directory Structure Assessment

- **api/**: Vercel serverless functions — clear
- **src/**: React app — well organized by feature
- **supabase/**: Migrations and Edge Functions — consistent
- **scripts/**: Dev and utility scripts — some duplication (see #8)
- **docs/**: Contains secrets (see #1) — needs cleanup

---

## Recommended Action Order

1. **Immediate:** Remove and rotate exposed secrets (#1)
2. **Immediate:** Fix BackendHealthCheck logic (#2)
3. **High:** Fix `/ahlulbayt` → `/ahlul-bayt` everywhere (#3)
4. **High:** Align artist URLs (slug vs name) and sitemap (#4)
5. **High:** Add artist support to og-redirect (#5)
6. **High:** Resolve custom SW vs Vite PWA conflict (#6)
7. **Medium:** Remove duplicate configs/scripts (#7, #8)
8. **Medium:** Fix placeholder image and require() usage (#9, #10)

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | 6 |
| High     | 6 |
| Medium   | 5 |
| Low      | 3 |

**Build Status:** ✅ Succeeds  
**Lint Status:** No blocking errors (unused vars relaxed)

This audit was performed by analyzing the codebase directly; documentation was not assumed to be accurate.
