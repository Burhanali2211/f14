#!/usr/bin/env node
/**
 * Generates vercel-env-paste.txt from .env with real values for pasting into Vercel.
 * Run: node scripts/generate-vercel-env.js
 * Output: vercel-env-paste.txt (gitignored)
 */

import { readFileSync, writeFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');
const outPath = join(root, 'vercel-env-paste.txt');

function loadEnv() {
  try {
    return readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .reduce((acc, line) => {
        const eq = line.indexOf('=');
        if (eq > 0) {
          const key = line.slice(0, eq).trim();
          let val = line.slice(eq + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');
          else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'");
          acc[key] = val;
        }
        return acc;
      }, {});
  } catch (err) {
    console.error('Could not read .env:', err.message);
    process.exit(1);
  }
}

const env = loadEnv();

// Generate TELEGRAM_WEBHOOK_SECRET if missing
let webhookSecret = env.TELEGRAM_WEBHOOK_SECRET || env.VITE_TELEGRAM_WEBHOOK_SECRET;
if (!webhookSecret) {
  webhookSecret = randomBytes(32).toString('hex');
  console.log('Generated TELEGRAM_WEBHOOK_SECRET:', webhookSecret);
}

const lines = [
  'VITE_SUPABASE_URL=' + (env.VITE_SUPABASE_URL || ''),
  'VITE_SUPABASE_PUBLISHABLE_KEY=' + (env.VITE_SUPABASE_PUBLISHABLE_KEY || ''),
  'SUPABASE_SERVICE_ROLE_KEY=' + (env.SUPABASE_SERVICE_ROLE_KEY || ''),
  'R2_ACCOUNT_ID=' + (env.R2_ACCOUNT_ID || ''),
  'R2_ACCESS_KEY_ID=' + (env.R2_ACCESS_KEY_ID || ''),
  'R2_SECRET_ACCESS_KEY=' + (env.R2_SECRET_ACCESS_KEY || ''),
  'R2_BUCKET_NAME=' + (env.R2_BUCKET_NAME || 'kalaam-reader'),
  'TELEGRAM_BOT_TOKEN=' + (env.TELEGRAM_BOT_TOKEN || ''),
  'TELEGRAM_CHAT_ID=' + (env.TELEGRAM_CHAT_ID || ''),
  'TELEGRAM_WEBHOOK_SECRET=' + webhookSecret,
  'VITE_TELEGRAM_WEBHOOK_SECRET=' + webhookSecret,
  'VITE_TELEGRAM_CHAT_ID=' + (env.TELEGRAM_CHAT_ID || env.VITE_TELEGRAM_CHAT_ID || ''),
  'ALLOWED_ORIGINS=https://followerof14.vercel.app,https://followersof14.vercel.app,https://followersof14.com,https://www.followersof14.com',
  'SITE_URL=' + (env.SITE_URL || 'https://followersof14.com'),
  'VITE_EARNINGS_ACCESS_PASSWORD=' + (env.VITE_EARNINGS_ACCESS_PASSWORD || ''),
  'VITE_VAPID_PUBLIC_KEY=' + (env.VITE_VAPID_PUBLIC_KEY || ''),
];

writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log('Wrote', outPath);
console.log('Copy the contents and paste into Vercel → Settings → Environment Variables → Bulk Edit.');
