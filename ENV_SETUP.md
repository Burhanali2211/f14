# Environment Variables Setup

Your Supabase project is configured and connected. Here are the details:

## Supabase Project Details
- **Project URL**: `https://fryhcufmzoxgabdklpiq.supabase.co`
- **Publishable Key (Legacy)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeWhjdWZtem94Z2FiZGtscGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzUyMzMsImV4cCI6MjA4NDExMTIzM30.YekaMYY-twCKNgbQEKSwLs6VgRA4DUFIOCg_oCeGeVM`
- **Publishable Key (Modern)**: `sb_publishable_aR5jdu8baiw64DOWXLewNw_wzRkK0sv`

## Environment Variables

Create a `.env` or `.env.local` file in the root directory with:

```env
VITE_SUPABASE_URL=https://fryhcufmzoxgabdklpiq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_aR5jdu8baiw64DOWXLewNw_wzRkK0sv
```

Or if you prefer the legacy key:
```env
VITE_SUPABASE_URL=https://fryhcufmzoxgabdklpiq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeWhjdWZtem94Z2FiZGtscGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzUyMzMsImV4cCI6MjA4NDExMTIzM30.YekaMYY-twCKNgbQEKSwLs6VgRA4DUFIOCg_oCeGeVM`
```

## Database Status

✅ **Fixed Issues:**
1. Updated `profiles` table role constraint to allow: `admin`, `uploader`, `user`, `seller`, `customer`
2. Updated default role to `'user'`
3. Fixed trigger function `handle_new_user()` to properly create profiles on signup
4. Added INSERT policy for profiles table

## Testing Signup

The signup should now work correctly. The trigger will:
- Automatically create a profile with role `'user'` when a new user signs up
- Handle conflicts gracefully
- Not block user creation if there's a minor issue

Try signing up again - it should work now!
