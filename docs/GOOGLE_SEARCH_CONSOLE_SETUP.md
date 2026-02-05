# Google Search Console Setup Guide

Your site wasn't appearing in Google search because of **two critical issues** that have now been fixed. Follow these steps to get indexed.

## Issues Fixed

### 1. Domain typo (CRITICAL)
The codebase had **`followerof14`** (missing 's') instead of **`followersof14`** in:
- `robots.txt` – Sitemap URL pointed to wrong domain (404)
- `index.html` – Canonical URLs, Open Graph, structured data pointed to wrong domain
- API fallbacks – Sitemap and OG redirect used wrong domain

**Impact:** Google was told the "canonical" URL was a different domain. The sitemap URL in robots.txt returned 404. Google couldn't discover or index your pages properly.

### 2. Google Search Console not set up
Google doesn't automatically index every site. You must add and verify your property in Search Console, then submit your sitemap.

---

## Step-by-Step: Get Your Site on Google

### Step 1: Add your site to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click **"Add property"**
4. Choose **"URL prefix"** and enter:
   - `https://followersof14.vercel.app` (or your custom domain like `https://followersof14.com`)
5. Click **Continue**

### Step 2: Verify ownership

Choose one method:

**Option A: HTML file (recommended for Vercel)**
1. Download the verification HTML file from Search Console
2. Place it in your `public/` folder
3. Deploy – the file will be at `https://yoursite.com/verification-file.html`
4. Click **Verify** in Search Console

**Option B: HTML meta tag**
1. Copy the meta tag from Search Console (e.g. `<meta name="google-site-verification" content="xxx" />`)
2. Add it to the `<head>` of `index.html`
3. Deploy and click **Verify**

**Option C: DNS (if you have a custom domain)**
1. Add the TXT record to your domain's DNS
2. Wait for propagation (up to 48 hours)
3. Click **Verify**

### Step 3: Submit your sitemap

1. In Search Console, go to **Sitemaps** (left sidebar)
2. Enter: `sitemap.xml`
3. Click **Submit**

Your sitemap is at: `https://followersof14.vercel.app/sitemap.xml`

### Step 4: Request indexing for key pages (optional but helpful)

1. Use the **URL Inspection** tool at the top of Search Console
2. Enter: `https://followersof14.vercel.app`
3. Click **Request indexing**
4. Repeat for a few important URLs (homepage, main categories)

### Step 5: Add both domains if you use a custom domain

If you use `followersof14.com` as your main domain:
- Add **both** properties: `https://followersof14.com` and `https://followersof14.vercel.app`
- Set the canonical in your code to your preferred domain (e.g. followersof14.com)
- Submit the sitemap for each property

---

## Why "Followers of 14" searches didn't show your site

1. **Wrong canonical URLs** – Google was told your real URL was `followerof14.vercel.app` (typo), which may not exist or may 404.
2. **Broken sitemap reference** – `robots.txt` pointed to the wrong domain, so Google couldn't find your sitemap.
3. **No Search Console** – Without verification, Google has no signal that you want to be indexed and no way to report crawl errors.
4. **New/small site** – Google prioritizes established, linked sites. Even with correct setup, indexing can take days to weeks.

---

## After setup: what to expect

- **First crawl:** Usually within 1–7 days
- **Full indexing:** Can take 1–4 weeks for a new site
- **Ranking for "Followers of 14":** Depends on content, backlinks, and competition. Keep adding quality content and internal links.

---

## Checklist

- [ ] Add property in Google Search Console
- [ ] Verify ownership
- [ ] Submit sitemap.xml
- [ ] Request indexing for homepage
- [ ] Deploy the domain typo fixes (robots.txt, index.html, API files)
- [ ] Confirm sitemap works: visit `https://followersof14.vercel.app/sitemap.xml`
- [ ] Confirm robots.txt works: visit `https://followersof14.vercel.app/robots.txt`
