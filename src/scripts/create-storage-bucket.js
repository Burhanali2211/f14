/**
 * Script to create the piece-images storage bucket in Supabase
 * 
 * Usage:
 * 1. Make sure you have your Supabase service role key (not the anon key)
 * 2. Set it as an environment variable: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 3. Set your Supabase URL: export SUPABASE_URL=your_supabase_url
 * 4. Run: node scripts/create-storage-bucket.js
 * 
 * Or run the SQL directly in Supabase SQL Editor (recommended)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.log('\nYou can either:');
  console.log('1. Set environment variables and run this script');
  console.log('2. Run the SQL in Supabase SQL Editor (see create-storage-bucket.sql)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBucket() {
  console.log('🔄 Creating piece-images bucket...');
  
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets?.some(b => b.id === 'piece-images');
    
    if (bucketExists) {
      console.log('✅ Bucket "piece-images" already exists!');
      return;
    }
    
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('piece-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: '10MB'
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error);
      return;
    }
    
    console.log('✅ Bucket "piece-images" created successfully!');
    console.log('📝 Note: You may need to create storage policies manually via SQL Editor');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createBucket();

