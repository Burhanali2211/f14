/**
 * Script to update calendar events with the exact dates provided
 * Run with: node scripts/update-calendar-events.js
 * 
 * Make sure to set environment variables:
 * VITE_SUPABASE_URL=your_supabase_url
 * VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch {
    return {};
  }
}

const envLocal = loadEnvFile(join(__dirname, '../.env.local'));
const env = loadEnvFile(join(__dirname, '../.env'));
const allEnv = { ...process.env, ...env, ...envLocal };

const SUPABASE_URL = allEnv.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = allEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('You can set them in .env or .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Event data from the user's table
interface EventData {
  gregorianDate: string; // Format: "YYYY-MM-DD"
  hijriDate: string;
  day: string;
  event: string;
}

const events: EventData[] = [
  { gregorianDate: '2025-12-17', hijriDate: '26 Jumada al-Thani 1447', day: 'Wednesday', event: 'Martyrdom of **Ali al-Hadi**' },
  { gregorianDate: '2025-12-21', hijriDate: '1 Rajab 1447', day: 'Sunday', event: 'Birth of **Muhammad al-Baqir** (57 AH)' },
  { gregorianDate: '2025-12-27', hijriDate: '7 Rajab 1447', day: 'Saturday', event: 'Birth of **Abbas ibn Ali** (36 AH)' },
  { gregorianDate: '2025-12-30', hijriDate: '10 Rajab 1447', day: 'Tuesday', event: 'Birth of **Muhammad al-Taqi** (195 AH)' },
  { gregorianDate: '2026-01-02', hijriDate: '13 Rajab 1447', day: 'Friday', event: 'Birth of **Ali ibn Abi Talib** (23 BH)' },
  { gregorianDate: '2026-01-04', hijriDate: '15 Rajab 1447', day: 'Sunday', event: 'Martyrdom of **Ja\'far al-Sadiq**' },
  { gregorianDate: '2026-01-07', hijriDate: '18 Rajab 1447', day: 'Wednesday', event: 'Death of **Abraham**' },
  { gregorianDate: '2026-01-09', hijriDate: '20 Rajab 1447', day: 'Friday', event: 'Birth of **Sukaynah bint Husayn**' },
  { gregorianDate: '2026-01-11', hijriDate: '22 Rajab 1447', day: 'Sunday', event: '**Koo\'nda**' },
  { gregorianDate: '2026-01-13', hijriDate: '24 Rajab 1447', day: 'Tuesday', event: 'Birth of **Ali al-Asghar ibn Husayn**' },
  { gregorianDate: '2026-01-14', hijriDate: '25 Rajab 1447', day: 'Wednesday', event: 'Martyrdom of **Musa al-Kadhim**' },
  { gregorianDate: '2026-01-15', hijriDate: '26 Rajab 1447', day: 'Thursday', event: 'Martyrdom of **Abu Talib**' },
  { gregorianDate: '2026-01-16', hijriDate: '27 Rajab 1447', day: 'Friday', event: '**Mi\'raj & Day of Mab\'ath**' },
  { gregorianDate: '2026-01-17', hijriDate: '28 Rajab 1447', day: 'Saturday', event: 'Imam **Husayn** departs Madinah for Karbala (60 AH)' },
  { gregorianDate: '2026-01-20', hijriDate: '1 Sha\'aban 1447', day: 'Tuesday', event: 'Birth of **Zaynab bint Ali** (6 AH)' },
  { gregorianDate: '2026-01-22', hijriDate: '3 Sha\'aban 1447', day: 'Thursday', event: 'Birth of **Husayn ibn Ali** (4 AH)' },
  { gregorianDate: '2026-01-23', hijriDate: '4 Sha\'aban 1447', day: 'Friday', event: 'Birth of **Abbas ibn Ali**' },
  { gregorianDate: '2026-01-24', hijriDate: '5 Sha\'aban 1447', day: 'Saturday', event: 'Birth of **Ali ibn Husayn (Zayn al-Abidin)**' },
  { gregorianDate: '2026-01-30', hijriDate: '11 Sha\'aban 1447', day: 'Friday', event: 'Birth of **Ali al-Akbar ibn Husayn**' },
  { gregorianDate: '2026-02-02', hijriDate: '14 Sha\'aban 1447', day: 'Monday', event: 'Birth of **Qasim ibn Hasan**' },
  { gregorianDate: '2026-02-02', hijriDate: '14 Sha\'aban 1447', day: 'Monday', event: '**Laylat al-Bara\'at / Shab-e-Barat**' },
  { gregorianDate: '2026-02-03', hijriDate: '15 Sha\'aban 1447', day: 'Tuesday', event: 'Birth of **Muhammad al-Mahdi**' },
  { gregorianDate: '2026-02-05', hijriDate: '17 Sha\'aban 1447', day: 'Thursday', event: 'Birth of **Ruqayyah bint Husayn**' },
  { gregorianDate: '2026-02-21', hijriDate: '4 Ramadan 1447', day: 'Saturday', event: 'Descending of the **Torah**' },
  { gregorianDate: '2026-02-27', hijriDate: '10 Ramadan 1447', day: 'Friday', event: 'Death of **Khadijah bint Khuwaylid**' },
  { gregorianDate: '2026-03-01', hijriDate: '12 Ramadan 1447', day: 'Sunday', event: 'Descending of the **Gospel**' },
  { gregorianDate: '2026-03-03', hijriDate: '14 Ramadan 1447', day: 'Tuesday', event: 'Martyrdom of **Mukhtar al-Thaqafi**' },
  { gregorianDate: '2026-03-04', hijriDate: '15 Ramadan 1447', day: 'Wednesday', event: 'Birth of **Hasan ibn Ali**' },
  { gregorianDate: '2026-03-06', hijriDate: '17 Ramadan 1447', day: 'Friday', event: '⚔️ **Battle of Badr**' },
  { gregorianDate: '2026-03-07', hijriDate: '18 Ramadan 1447', day: 'Saturday', event: 'Descending of the **Psalms**' },
  { gregorianDate: '2026-03-08', hijriDate: '19 Ramadan 1447', day: 'Sunday', event: '1st Night of **Laylat al-Qadr**' },
  { gregorianDate: '2026-03-09', hijriDate: '20 Ramadan 1447', day: 'Monday', event: '**Conquest of Mecca**' },
  { gregorianDate: '2026-03-10', hijriDate: '21 Ramadan 1447', day: 'Tuesday', event: '2nd Night of **Laylat al-Qadr**' },
  { gregorianDate: '2026-03-12', hijriDate: '23 Ramadan 1447', day: 'Thursday', event: '3rd Night of **Laylat al-Qadr**' },
  { gregorianDate: '2026-03-13', hijriDate: '24 Ramadan 1447', day: 'Friday', event: '**Jumu\'atul-Wida**' },
  { gregorianDate: '2026-03-20', hijriDate: '1 Shawwal 1447', day: 'Friday', event: '**Eid al-Fitr**' },
  { gregorianDate: '2026-03-21', hijriDate: '2 Shawwal 1447', day: 'Saturday', event: '⚔️ **Battle of the Trench**' },
  { gregorianDate: '2026-03-27', hijriDate: '8 Shawwal 1447', day: 'Friday', event: '**Day of Sorrow**' },
  { gregorianDate: '2026-03-28', hijriDate: '9 Shawwal 1447', day: 'Saturday', event: 'Marriage of **Khadijah & Muhammad**' },
  { gregorianDate: '2026-03-29', hijriDate: '10 Shawwal 1447', day: 'Sunday', event: 'Beginning of **Major Occultation**' },
  { gregorianDate: '2026-04-03', hijriDate: '15 Shawwal 1447', day: 'Friday', event: '⚔️ Martyrdom of **Hamzah** (Uhud)' },
  { gregorianDate: '2026-08-03', hijriDate: '20 Safar 1448', day: 'Monday', event: '**Arbaeen**' },
  { gregorianDate: '2026-06-25', hijriDate: '10 Muharram 1448', day: 'Thursday', event: '**Āshūrā**' },
  { gregorianDate: '2026-06-04', hijriDate: '18 Dhu al-Hijjah 1447', day: 'Thursday', event: '**Eid al-Ghadir**' },
  { gregorianDate: '2026-06-10', hijriDate: '24 Dhu al-Hijjah 1447', day: 'Wednesday', event: '**Eid al-Mubahalah**' },
  { gregorianDate: '2026-06-16', hijriDate: '1 Muharram 1448', day: 'Tuesday', event: 'Beginning of **Muharram Mourning**' },
  { gregorianDate: '2026-08-30', hijriDate: '17 Rabi\' al-Awwal 1448', day: 'Sunday', event: 'Birth of **Prophet Muhammad**' },
  { gregorianDate: '2026-12-06', hijriDate: '26 Jumada al-Thani 1448', day: 'Sunday', event: 'Martyrdom of **Ali al-Hadi**' },
  { gregorianDate: '2026-12-10', hijriDate: '1 Rajab 1448', day: 'Thursday', event: 'Birth of **Muhammad al-Baqir**' },
];

// Map event names to imam names (for matching with database)
const imamNameMap: Record<string, string> = {
  'Ali al-Hadi': 'Ali al-Hadi',
  'Muhammad al-Baqir': 'Muhammad al-Baqir',
  'Abbas ibn Ali': 'Abbas ibn Ali',
  'Muhammad al-Taqi': 'Muhammad al-Taqi',
  'Ali ibn Abi Talib': 'Ali ibn Abi Talib',
  'Ja\'far al-Sadiq': 'Ja\'far al-Sadiq',
  'Abraham': 'Abraham',
  'Sukaynah bint Husayn': 'Sukaynah bint Husayn',
  'Ali al-Asghar ibn Husayn': 'Ali al-Asghar ibn Husayn',
  'Musa al-Kadhim': 'Musa al-Kadhim',
  'Abu Talib': 'Abu Talib',
  'Husayn': 'Husayn ibn Ali',
  'Zaynab bint Ali': 'Zaynab bint Ali',
  'Husayn ibn Ali': 'Husayn ibn Ali',
  'Ali ibn Husayn (Zayn al-Abidin)': 'Ali ibn Husayn',
  'Ali al-Akbar ibn Husayn': 'Ali al-Akbar ibn Husayn',
  'Qasim ibn Hasan': 'Qasim ibn Hasan',
  'Muhammad al-Mahdi': 'Muhammad al-Mahdi',
  'Ruqayyah bint Husayn': 'Ruqayyah bint Husayn',
  'Hasan ibn Ali': 'Hasan ibn Ali',
  'Hamzah': 'Hamzah',
  'Prophet Muhammad': 'Prophet Muhammad (PBUH)',
};

// Determine event type from event description
function getEventType(event: string): 'birthday' | 'death' | 'martyrdom' | 'other' {
  const lowerEvent = event.toLowerCase();
  if (lowerEvent.includes('birth') || lowerEvent.includes('birth of')) {
    return 'birthday';
  }
  if (lowerEvent.includes('martyrdom') || lowerEvent.includes('martyr')) {
    return 'martyrdom';
  }
  if (lowerEvent.includes('death') || lowerEvent.includes('died')) {
    return 'death';
  }
  return 'other';
}

// Extract imam name from event description
function extractImamName(event: string): string | null {
  // Remove markdown formatting
  let cleanEvent = event.replace(/\*\*/g, '');
  
  // Try to find imam name in the map
  for (const [key, value] of Object.entries(imamNameMap)) {
    if (cleanEvent.includes(key)) {
      return value;
    }
  }
  
  return null;
}

async function main() {
  console.log('Starting calendar events update...\n');

  // Step 1: Fetch all existing events and delete them
  console.log('Step 1: Fetching existing events...');
  const { data: existingEvents, error: fetchError } = await supabase
    .from('ahlul_bait_events')
    .select('id');

  if (fetchError) {
    console.error('Error fetching existing events:', fetchError);
    process.exit(1);
  }

  if (existingEvents && existingEvents.length > 0) {
    console.log(`Found ${existingEvents.length} existing events. Deleting...`);
    const { error: deleteError } = await supabase
      .from('ahlul_bait_events')
      .delete()
      .in('id', existingEvents.map(e => e.id));

    if (deleteError) {
      console.error('Error deleting existing events:', deleteError);
      process.exit(1);
    }
    console.log('✓ Deleted existing events\n');
  } else {
    console.log('No existing events found\n');
  }

  // Step 2: Fetch all imams to create name-to-id mapping
  console.log('Step 2: Fetching imams...');
  const { data: imams, error: imamsError } = await supabase
    .from('imams')
    .select('id, name, slug');

  if (imamsError) {
    console.error('Error fetching imams:', imamsError);
    process.exit(1);
  }

  if (!imams || imams.length === 0) {
    console.error('No imams found in database. Please create imams first.');
    process.exit(1);
  }

  console.log(`Found ${imams.length} imams`);
  const imamMap = new Map<string, string>();
  imams.forEach(imam => {
    imamMap.set(imam.name.toLowerCase(), imam.id);
    imamMap.set(imam.slug.toLowerCase(), imam.id);
  });

  // Step 3: Prepare events for insertion
  console.log('\nStep 3: Preparing events for insertion...');
  const eventsToInsert: any[] = [];
  const skippedEvents: string[] = [];

  for (const eventData of events) {
    const imamName = extractImamName(eventData.event);
    let imamId: string | null = null;

    if (imamName) {
      // Try to find imam by name
      const foundImam = imams.find(i => 
        i.name.toLowerCase().includes(imamName.toLowerCase()) ||
        imamName.toLowerCase().includes(i.name.toLowerCase())
      );
      
      if (foundImam) {
        imamId = foundImam.id;
      } else {
        // Try partial matching
        for (const [key, value] of Object.entries(imamNameMap)) {
          if (imamName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(imamName.toLowerCase())) {
            const partialMatch = imams.find(i => 
              i.name.toLowerCase().includes(value.toLowerCase()) ||
              value.toLowerCase().includes(i.name.toLowerCase())
            );
            if (partialMatch) {
              imamId = partialMatch.id;
              break;
            }
          }
        }
      }
    }

    // If no imam found, we'll still create the event but without imam_id
    // Some events like "Eid al-Fitr" don't have a specific imam

    const eventType = getEventType(eventData.event);
    const eventName = eventData.event.replace(/\*\*/g, '').trim();
    
    // Create description with Hijri date
    const description = `Hijri: ${eventData.hijriDate}`;

    // For events without imam, we need to handle them differently
    // Some events like "Eid al-Fitr" don't have a specific imam
    // We'll create a general imam entry or use NULL if allowed
    if (!imamId) {
      // Try to find or create a "General" imam
      let generalImam = imams.find(i => i.name.toLowerCase().includes('general'));
      if (!generalImam) {
        // Create a general imam entry
        const { data: newGeneralImam, error: createError } = await supabase
          .from('imams')
          .insert([{
            name: 'General',
            slug: 'general',
            description: 'General events',
            order_index: 999
          }])
          .select()
          .single();
        
        if (createError && !createError.message.includes('duplicate')) {
          console.warn(`Could not create general imam: ${createError.message}`);
        } else if (newGeneralImam) {
          generalImam = newGeneralImam;
          imamId = newGeneralImam.id;
        }
      } else {
        imamId = generalImam.id;
      }
    }

    eventsToInsert.push({
      imam_id: imamId || imams[0]?.id || '00000000-0000-0000-0000-000000000000', // Fallback to first imam or placeholder
      event_type: eventType,
      event_date: eventData.gregorianDate,
      event_name: eventName,
      description: description,
      is_annual: true, // All these events are annual
    });

    if (!imamId) {
      skippedEvents.push(`${eventName} (no imam match found)`);
    }
  }

  console.log(`Prepared ${eventsToInsert.length} events for insertion`);
  if (skippedEvents.length > 0) {
    console.log(`\nNote: ${skippedEvents.length} events without imam matches:`);
    skippedEvents.forEach(e => console.log(`  - ${e}`));
  }

  // Step 4: Insert events in batches
  console.log('\nStep 4: Inserting events...');
  const batchSize = 10;
  let inserted = 0;

  for (let i = 0; i < eventsToInsert.length; i += batchSize) {
    const batch = eventsToInsert.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('ahlul_bait_events')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
      console.error('Failed batch:', batch);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${eventsToInsert.length})`);
  }

  console.log(`\n✓ Successfully inserted ${inserted} events!`);
  console.log('\nCalendar events update completed!');
}

main().catch(console.error);
