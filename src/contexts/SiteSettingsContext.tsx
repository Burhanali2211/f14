import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { SiteSettings } from '@/lib/supabase-types';

const DEFAULT_SETTINGS: SiteSettings = {
  id: '00000000-0000-0000-0000-000000000000',
  site_name: 'Kalam Reader',
  site_tagline: 'islamic poetry',
  logo_url: '/main.png',
  hero_image_url: null,
  hero_image_opacity: 1.0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as any;

interface SiteSettingsContextType {
  siteSettings: SiteSettings;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSiteSettings = useCallback(async () => {
    try {
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('site_settings')
          .select('*')
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
    const channel = supabase
      .channel('site-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          fetchSiteSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSiteSettings]);

  return (
    <SiteSettingsContext.Provider value={{ siteSettings, isLoading, refetch: fetchSiteSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextType {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    return {
      siteSettings: DEFAULT_SETTINGS,
      isLoading: false,
      refetch: async () => {},
    };
  }
  return context;
}
