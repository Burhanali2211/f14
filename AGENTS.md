## Project Summary
A comprehensive hub for sacred recitations, Quranic content, and Shia religious resources. The platform allows users to browse, listen to, and upload recitations, with features like AI-enhanced content extraction and real-time notifications via Telegram.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Backend/BaaS**: Supabase (Authentication, PostgreSQL Database, Edge Functions)
- **Storage**: Cloudflare R2 (for audio and media files)
- **API/Serverless**: Vercel Serverless Functions (for R2 presigned URLs and Telegram notifications)
- **AI**: Hugging Face (AI-enhanced text extraction and content processing)
- **Notifications**: Telegram Bot API

## Architecture
- `src/components`: UI components organized by feature (Quran, Media, Admin, etc.)
- `api/`: Vercel serverless functions for handling backend logic that requires secrets
- `supabase/functions`: Edge functions for AI processing and website content fetching
- `src/integrations/supabase`: Supabase client and database type definitions
- `src/pages`: Main application routes

## User Preferences
- Clean, modern religious aesthetic with distinctive typography
- Seamless audio playback experience
- Fast content uploading via Cloudflare R2
- Automated notifications for administrative actions

## Project Guidelines
- Use Supabase Auth for user management
- Store large media files in Cloudflare R2, not Supabase Storage
- Use Vercel serverless functions in the `api/` directory for any operations requiring sensitive credentials (R2, Telegram)
- Follow the "Followers of 14" content policy for religious accuracy

## Common Patterns
- **API Communication**: Use `fetch` to call Vercel functions at `/api/[endpoint]`
- **State Management**: React Context for global state (Audio, UI, Auth)
- **Database Access**: Use the generated Supabase client for all DB operations
- **Notifications**: Use the `telegram-notify` API for system events

## Critical Reminders
### Cloudflare R2 Credentials
- **R2_ACCESS_KEY_ID**: Must be exactly 32 characters (NOT the Token Value which is 40 chars)
- **R2_SECRET_ACCESS_KEY**: Must be exactly 64 characters
- When creating R2 API tokens, copy the **Access Key ID** field, NOT the "Token Value"
- Always restart the dev server after updating .env files to pick up new values
