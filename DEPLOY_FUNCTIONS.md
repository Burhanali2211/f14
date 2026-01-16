# Deploy Supabase Edge Functions

The new edge functions (`fetch-content` and `ai-enhance`) need to be deployed to your Supabase project.

## Quick Start

**Windows:**
```bash
deploy-functions.bat
```

**Mac/Linux:**
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project (if not already linked):
   ```bash
   supabase link --project-ref qsmllpflneqlpmwzhjou
   ```

## Deploy Functions

### Option 1: Deploy All Functions
```bash
supabase functions deploy
```

### Option 2: Deploy Individual Functions

Deploy fetch-content:
```bash
supabase functions deploy fetch-content
```

Deploy ai-enhance:
```bash
supabase functions deploy ai-enhance
```

## Set Environment Variables

After deploying, set the required environment variables. **See `FREE_AI_SETUP.md` for detailed instructions on setting up FREE AI providers.**

### Quick Setup (Hugging Face - Free):

```bash
# Set AI provider
supabase secrets set AI_PROVIDER=huggingface

# Set Hugging Face API key (get free token from https://huggingface.co/settings/tokens)
supabase secrets set HUGGINGFACE_API_KEY=your_token_here
```

### Other Free Options:

- **Groq**: `AI_PROVIDER=groq` + `AI_API_KEY=your_key`
- **Together AI**: `AI_PROVIDER=together` + `AI_API_KEY=your_key`
- **Gemini**: `AI_PROVIDER=gemini` + `AI_API_KEY=your_key`

### Optional:

```bash
# Set ALLOWED_ORIGINS (optional)
supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**📖 For detailed setup instructions, see `FREE_AI_SETUP.md`**

## Verify Deployment

After deployment, you can test the functions:

1. Go to Supabase Dashboard → Edge Functions
2. You should see `fetch-content` and `ai-enhance` in the list
3. Test them from the dashboard or use the API

## Troubleshooting

### Function returns 404
- Make sure the function is deployed: `supabase functions list`
- Check that the function name matches exactly (case-sensitive)

### CORS errors
- Verify CORS headers in the function code
- Check that `ALLOWED_ORIGINS` environment variable is set correctly

### Function errors
- Check function logs in Supabase Dashboard → Edge Functions → Logs
- Verify environment variables are set correctly
- Check that `LOVABLE_API_KEY` is valid

## Quick Deploy Script

You can also create a script to deploy all functions at once:

```bash
#!/bin/bash
supabase functions deploy fetch-content
supabase functions deploy ai-enhance
supabase functions deploy translate
```

Save as `deploy-functions.sh` and run:
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

