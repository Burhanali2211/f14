# Apply user_audio_files Table to Kalaam Reader

The `user_audio_files` table is required for R2 audio uploads to work. Apply it using one of these methods:

## Option 1: Supabase Dashboard (recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **Kalaam Reader** project (ysacmemkrnmczmtkfqad)
3. Open **SQL Editor** → **New query**
4. Copy the contents of `apply_user_audio_files.sql`
5. Click **Run**

## Option 2: Supabase CLI

If your project is linked:

```bash
supabase link --project-ref ysacmemkrnmczmtkfqad
supabase db push
```

## Verify

After applying, the table should exist. Restart your dev server and try uploading audio again.
