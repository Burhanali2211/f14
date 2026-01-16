# Netlify Deployment Guide

This project is now ready for deployment on Netlify! 🚀

## What's Been Configured

✅ **netlify.toml** - Netlify build configuration
✅ **_redirects** - SPA routing support for React Router
✅ **.gitignore** - Environment files excluded from git

## Deployment Steps

### 1. Connect to GitHub

If you haven't already connected your repository to GitHub:

```bash
# Add your GitHub repository as remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 2. Deploy on Netlify

1. **Go to [Netlify](https://www.netlify.com/)** and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"GitHub"** and authorize Netlify
4. Select your repository
5. Netlify will automatically detect the settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. **IMPORTANT**: Add your environment variables in Netlify:
   - Go to **Site settings** → **Environment variables**
   - Add the following:
      - `VITE_SUPABASE_URL` = `https://fryhcufmzoxgabdklpiq.supabase.co`
      - `VITE_SUPABASE_PUBLISHABLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeWhjdWZtem94Z2FiZGtscGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzUyMzMsImV4cCI6MjA4NDExMTIzM30.YekaMYY-twCKNgbQEKSwLs6VgRA4DUFIOCg_oCeGeVM`
7. Click **"Deploy site"**

### 3. Automatic Deployments

Once connected, Netlify will automatically:
- Deploy on every push to the main branch
- Build your site using the configured settings
- Handle SPA routing with the `_redirects` file

## Environment Variables

Make sure to add these in Netlify's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are required for your Supabase integration to work in production.

## Custom Domain (Optional)

After deployment, you can:
1. Go to **Site settings** → **Domain management**
2. Add your custom domain
3. Follow Netlify's DNS configuration instructions

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **404 errors on routes**: The `_redirects` file should handle this automatically
- **Supabase not working**: Verify environment variables are set in Netlify

## Next Steps

After deployment, your site will be live at: `https://your-site-name.netlify.app`

Happy deploying! 🎉

