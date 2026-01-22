import { createClient } from '@supabase/supabase-js';

const AIRSEND_SUPABASE_URL = 'https://ysacmemkrnmczmtkfqad.supabase.co';
const AIRSEND_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYWNtZW1rcm5tY3ptdGtmcWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjE3OTgsImV4cCI6MjA4MDkzNzc5OH0.qCvfISmTCwJkBnfQnwTBfpjohAnTwt5VWuZHOR_HhZY';

export const airsendSupabase = createClient(AIRSEND_SUPABASE_URL, AIRSEND_SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
