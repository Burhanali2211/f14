import { logger } from './logger';
import { supabase } from '@/integrations/supabase/client';

const SETTINGS_STORAGE_KEY = 'earning_settings_v1';
const SESSION_KEY = 'earning_settings_session';
const SESSION_DURATION = 30 * 60 * 1000;


export interface MilestoneConfig {
  id: string;
  name: string;
  requiredCount: number;
  bonus: number;
  icon: string;
  description: string;
}

export interface EarningRatesConfig {
  perRecitation: number;
  bonusPerMilestone: number;
  currency: string;
  currencySymbol: string;
  minimumPayout: number;
  milestones: MilestoneConfig[];
}

const DEFAULT_RATES: EarningRatesConfig = {
  perRecitation: 50,
  bonusPerMilestone: 500,
  currency: 'INR',
  currencySymbol: '₹',
  minimumPayout: 500,
  milestones: [
    { id: 'first_upload', name: 'First Steps', requiredCount: 1, bonus: 100, icon: '🌟', description: 'Upload your first recitation' },
    { id: 'rising_star', name: 'Rising Star', requiredCount: 10, bonus: 500, icon: '⭐', description: 'Upload 10 recitations' },
    { id: 'dedicated_uploader', name: 'Dedicated Uploader', requiredCount: 25, bonus: 1000, icon: '🏆', description: 'Upload 25 recitations' },
    { id: 'content_champion', name: 'Content Champion', requiredCount: 50, bonus: 2500, icon: '👑', description: 'Upload 50 recitations' },
    { id: 'master_contributor', name: 'Master Contributor', requiredCount: 100, bonus: 5000, icon: '💎', description: 'Upload 100 recitations' },
    { id: 'legendary_uploader', name: 'Legendary Uploader', requiredCount: 250, bonus: 15000, icon: '🔥', description: 'Upload 250 recitations' },
    { id: 'hall_of_fame', name: 'Hall of Fame', requiredCount: 500, bonus: 50000, icon: '🏛️', description: 'Upload 500 recitations' },
  ],
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sacred_recitations_salt_v2_secure');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function verifySettingsPassword(password: string): Promise<boolean> {
  const correctPassword = import.meta.env.VITE_EARNINGS_ACCESS_PASSWORD || '';
  if (!correctPassword) return false;

  if (password === correctPassword) {
    const session = {
      verified: true,
      timestamp: Date.now(),
      hash: await hashPassword(password + Date.now().toString()),
    };
    
    try {
      const encryptedSession = btoa(JSON.stringify(session));
      sessionStorage.setItem(SESSION_KEY, encryptedSession);
    } catch (error) {
      logger.error('Error storing session:', error);
    }
    
    return true;
  }
  
  return false;
}

export function isSettingsSessionValid(): boolean {
  try {
    const encryptedSession = sessionStorage.getItem(SESSION_KEY);
    if (!encryptedSession) return false;
    
    const session = JSON.parse(atob(encryptedSession));
    if (!session.verified || !session.timestamp) return false;
    
    const elapsed = Date.now() - session.timestamp;
    if (elapsed > SESSION_DURATION) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking session:', error);
    return false;
  }
}

export function clearSettingsSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function getEarningRatesConfig(): Promise<EarningRatesConfig> {
  try {
    const { data, error } = await supabase
      .from('earning_settings')
      .select('setting_value')
      .eq('setting_key', 'rates')
      .single();
    
    if (!error && data?.setting_value) {
      return data.setting_value as EarningRatesConfig;
    }
  } catch (error) {
    logger.error('Error fetching from database, using localStorage:', error);
  }
  
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.rates) {
        return parsed.rates as EarningRatesConfig;
      }
    }
  } catch (error) {
    logger.error('Error reading localStorage:', error);
  }
  
  return DEFAULT_RATES;
}

export async function saveEarningRatesConfig(config: EarningRatesConfig): Promise<boolean> {
  if (!isSettingsSessionValid()) {
    logger.error('Unauthorized: Settings session not valid');
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('earning_settings')
      .upsert({
        setting_key: 'rates',
        setting_value: config as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key',
      });
    
    if (error) {
      logger.error('Error saving to database:', error);
    }
  } catch (error) {
    logger.error('Database save failed:', error);
  }
  
  try {
    const data = {
      rates: config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error('Error saving to localStorage:', error);
    return false;
  }
}

export function getDefaultRates(): EarningRatesConfig {
  return { ...DEFAULT_RATES };
}
