# Free AI API Setup Guide

The functions now support multiple **FREE** AI providers. Choose one that works best for you!

## Supported Free AI Providers

### 1. **Hugging Face** (Recommended - Easiest to get started)
- **Free Tier**: Unlimited requests (with rate limits)
- **Get API Key**: https://huggingface.co/settings/tokens
- **Pros**: Very easy to get started, no credit card needed
- **Cons**: Models may take a few seconds to load on first request

### 2. **Groq** (Fastest - Recommended for speed)
- **Free Tier**: 14,400 requests/day
- **Get API Key**: https://console.groq.com/keys
- **Pros**: Extremely fast responses, good free tier
- **Cons**: Requires account creation

### 3. **Together AI** (Good balance)
- **Free Tier**: $25 free credits
- **Get API Key**: https://api.together.xyz/
- **Pros**: Good performance, generous free credits
- **Cons**: Credits eventually run out

### 4. **Google Gemini** (Google's AI)
- **Free Tier**: 60 requests/minute
- **Get API Key**: https://makersuite.google.com/app/apikey
- **Pros**: Google's reliable infrastructure
- **Cons**: Rate limits are stricter

## Setup Instructions

### Step 1: Get Your Free API Key

Choose one provider and get your API key from the links above.

### Step 2: Set Environment Variables in Supabase

#### Option A: Using Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/settings/functions
2. Click **"Add new secret"**
3. Add these secrets:

   **For Hugging Face:**
   ```
   AI_PROVIDER = huggingface
   HUGGINGFACE_API_KEY = your_huggingface_token_here
   ```

   **For Groq:**
   ```
   AI_PROVIDER = groq
   AI_API_KEY = your_groq_api_key_here
   ```

   **For Together AI:**
   ```
   AI_PROVIDER = together
   AI_API_KEY = your_together_api_key_here
   ```

   **For Gemini:**
   ```
   AI_PROVIDER = gemini
   AI_API_KEY = your_gemini_api_key_here
   ```

#### Option B: Using Supabase CLI

```bash
# For Hugging Face
supabase secrets set AI_PROVIDER=huggingface
supabase secrets set HUGGINGFACE_API_KEY=your_token_here

# For Groq
supabase secrets set AI_PROVIDER=groq
supabase secrets set AI_API_KEY=your_key_here

# For Together AI
supabase secrets set AI_PROVIDER=together
supabase secrets set AI_API_KEY=your_key_here

# For Gemini
supabase secrets set AI_PROVIDER=gemini
supabase secrets set AI_API_KEY=your_key_here
```

## Quick Start (Hugging Face - Easiest)

1. **Get Hugging Face Token:**
   - Go to: https://huggingface.co/settings/tokens
   - Click "New token"
   - Name it "supabase-functions"
   - Copy the token

2. **Set in Supabase:**
   ```bash
   supabase secrets set AI_PROVIDER=huggingface
   supabase secrets set HUGGINGFACE_API_KEY=your_token_here
   ```

3. **Done!** The functions will now use Hugging Face's free API.

## Testing

After setting up, test the functions:

1. Go to your app
2. Try "Fetch from Website" - it should work
3. Try "AI Enhance" - it should work

## Troubleshooting

### "AI service not configured"
- Make sure you set both `AI_PROVIDER` and the API key
- For Hugging Face, use `HUGGINGFACE_API_KEY`
- For others, use `AI_API_KEY`

### "Model is loading" (Hugging Face)
- This is normal on first request
- Wait 10-20 seconds and try again
- The model will stay loaded for subsequent requests

### Rate limit errors
- Hugging Face: Wait a moment and try again
- Groq: You've hit the daily limit (14,400 requests)
- Gemini: Wait 1 minute and try again
- Together AI: Check your remaining credits

### Which provider should I use?

- **Just starting?** → Use **Hugging Face** (easiest)
- **Need speed?** → Use **Groq** (fastest)
- **Want reliability?** → Use **Gemini** (Google)
- **Need more requests?** → Use **Together AI** (generous credits)

## Cost Comparison

All providers listed here have **FREE tiers**:
- ✅ **Hugging Face**: Completely free (with rate limits)
- ✅ **Groq**: 14,400 requests/day free
- ✅ **Together AI**: $25 free credits
- ✅ **Gemini**: 60 requests/minute free

No credit card required for any of these!

