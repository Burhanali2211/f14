# Next Steps - Complete Setup Guide

You've added the Hugging Face API key! Now follow these steps:

## Step 1: Deploy the Functions to Supabase

You need to deploy the `fetch-content` and `ai-enhance` functions to your Supabase project.

### Option A: Using Supabase Dashboard (Easiest - No CLI needed)

1. Go to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/functions
2. Click **"Create a new function"** or **"Deploy function"**
3. Upload the function files:
   - For `fetch-content`: Upload the contents of `supabase/functions/fetch-content/index.ts`
   - For `ai-enhance`: Upload the contents of `supabase/functions/ai-enhance/index.ts`

### Option B: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref qsmllpflneqlpmwzhjou
   ```

4. **Deploy the functions**:
   ```bash
   supabase functions deploy fetch-content
   supabase functions deploy ai-enhance
   ```

   Or use the deployment script:
   ```bash
   deploy-functions.bat
   ```

## Step 2: Set Environment Variables in Supabase

After deploying, set the environment variables:

### Using Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/settings/functions
2. Scroll down to **"Secrets"** section
3. Click **"Add new secret"** and add:

   **Secret 1:**
   - Name: `AI_PROVIDER`
   - Value: `huggingface`

   **Secret 2:**
   - Name: `HUGGINGFACE_API_KEY`
   - Value: `your_huggingface_token_here` (the token you got from Hugging Face)

### Using Supabase CLI:

```bash
supabase secrets set AI_PROVIDER=huggingface
supabase secrets set HUGGINGFACE_API_KEY=your_token_here
```

## Step 3: Test the Functions

1. **Start your development server** (if not running):
   ```bash
   npm run dev
   ```

2. **Test "Fetch from Website":**
   - Go to your app
   - Navigate to Add Piece page
   - Click "Fetch from Website" button
   - Enter a website URL (e.g., https://example.com)
   - Click "Fetch Content"
   - It should extract and populate the content

3. **Test "AI Enhance":**
   - Enter some text in the text content field
   - Click "AI Enhance" button
   - Select an enhancement type (e.g., "Enhance Reading")
   - Click "Apply Enhancement"
   - The text should be enhanced

## Troubleshooting

### Functions return 404
- Make sure functions are deployed: Check Supabase Dashboard → Functions
- Verify function names are exactly: `fetch-content` and `ai-enhance`

### "AI service not configured" error
- Check that both secrets are set: `AI_PROVIDER` and `HUGGINGFACE_API_KEY`
- Verify the Hugging Face token is correct
- Wait a few seconds after setting secrets (they need to propagate)

### "Model is loading" error (Hugging Face)
- This is normal on first request
- Wait 10-20 seconds and try again
- The model will stay loaded for subsequent requests

### CORS errors
- Make sure you're testing from the correct origin
- Check that the functions handle CORS properly (they should)

## Quick Checklist

- [ ] Functions deployed to Supabase
- [ ] `AI_PROVIDER` secret set to `huggingface`
- [ ] `HUGGINGFACE_API_KEY` secret set with your token
- [ ] Tested "Fetch from Website" feature
- [ ] Tested "AI Enhance" feature

## Need Help?

If you encounter any issues:
1. Check Supabase Dashboard → Functions → Logs for error messages
2. Verify all secrets are set correctly
3. Make sure the functions are deployed and active
4. Check browser console for any client-side errors

