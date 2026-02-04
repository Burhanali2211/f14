import { createClient } from '@supabase/supabase-js';

const AIRSEND_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AIRSEND_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!AIRSEND_SUPABASE_URL || !AIRSEND_SUPABASE_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY for AirSend client');
}

export const airsendSupabase = createClient(AIRSEND_SUPABASE_URL, AIRSEND_SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
