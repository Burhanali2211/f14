import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { realtimeManager } from '@/lib/realtime-manager';
import type { SiteSettings } from '@/lib/supabase-types';

export const DEFAULT_SETTINGS: SiteSettings = {
  id: '00000000-0000-0000-0000-000000000000',
  site_name: 'Followers of 14',
  site_tagline: 'Khanda Azaadars | Lyrics Hub',
  logo_url: '/main.png',
  hero_image_url: null,
  hero_gradient_opacity: 0.7,
  hero_image_opacity: 1,
  hero_gradient_preset: 'ocean',
  hero_badge_text: 'Islamic Poetry Hub',
  hero_heading_line1: 'Sacred Recitations',
  hero_heading_line2: '& Islamic Lyrics',
  hero_description: 'The #1 destination for Islamic poetry. Find any Naat, Noha, Dua, Manqabat, Marsiya.',
  hero_text_color_mode: 'light',
  hero_arabic_font: 'Amiri', // Essential fallback for reciters
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSiteSettings = useCallback(async () => {
    try {
      const SITE_SETTINGS_COLUMNS = 'id, site_name, site_tagline, logo_url, hero_image_url, hero_gradient_opacity, hero_image_opacity, hero_gradient_preset, hero_badge_text, hero_heading_line1, hero_heading_line2, hero_description, hero_text_color_mode, hero_arabic_font, created_at, updated_at';
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('site_settings')
          .select(SITE_SETTINGS_COLUMNS)
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .maybeSingle()
      );

      if (error) {
        logger.error('Error fetching site settings:', error);
      } else if (data) {
        setSiteSettings(data as SiteSettings);
      }
    } catch (error) {
      logger.error('Error fetching site settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteSettings();
  }, [fetchSiteSettings]);

  useEffect(() => {
    const subscriptionId = realtimeManager.subscribe(
      'site_settings',
      '*',
      () => {
        fetchSiteSettings();
      }
    );

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [fetchSiteSettings]);

  return (
    <SiteSettingsContext.Provider value={{ siteSettings, isLoading, refetch: fetchSiteSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
