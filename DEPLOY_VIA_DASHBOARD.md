# Deploy Functions via Supabase Dashboard (No CLI Needed!)

Since you don't have Supabase CLI installed, here's how to deploy via the Dashboard:

## Step 1: Deploy fetch-content Function

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/functions

2. **Create New Function:**
   - Click **"Create a new function"** or **"New Function"**
   - Function name: `fetch-content` (must be exact, lowercase with hyphen)

3. **Copy Function Code:**
   - Open the file: `supabase/functions/fetch-content/index.ts` in your editor
   - Copy ALL the code from that file
   - Paste it into the function editor in Supabase Dashboard

4. **Deploy:**
   - Click **"Deploy"** or **"Save"**

## Step 2: Deploy ai-enhance Function

1. **Create Another Function:**
   - Click **"Create a new function"** again
   - Function name: `ai-enhance` (must be exact, lowercase with hyphen)

2. **Copy Function Code:**
   - Open the file: `supabase/functions/ai-enhance/index.ts` in your editor
   - Copy ALL the code from that file
   - Paste it into the function editor

3. **Deploy:**
   - Click **"Deploy"** or **"Save"**

## Step 3: Set Environment Variables

1. **Go to Function Settings:**
   - Visit: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/settings/functions

2. **Add Secrets:**
   - Scroll to **"Secrets"** section
   - Click **"Add new secret"**
   
   **Add Secret 1:**
   - Name: `AI_PROVIDER`
   - Value: `huggingface`
   - Click **"Add"**
   
   **Add Secret 2:**
   - Name: `HUGGINGFACE_API_KEY`
   - Value: `your_huggingface_token_here` (paste your actual token)
   - Click **"Add"**

## Step 4: Verify Functions Are Deployed

1. Go back to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/functions
2. You should see both functions listed:
   - `fetch-content`
   - `ai-enhance`

## Step 5: Test

1. Go back to your app
2. Try "Fetch from Website" again
3. It should work now!

## Troubleshooting

### Function still returns 404
- Make sure function names are exactly: `fetch-content` and `ai-enhance` (lowercase, with hyphen)
- Check that functions show as "Active" in the dashboard
- Wait a minute after deploying for functions to be fully available

### Still getting errors
- Check Supabase Dashboard → Functions → Logs for error messages
- Verify both secrets are set correctly
- Make sure you copied the entire function code

