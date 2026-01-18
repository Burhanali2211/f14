import { useContext } from 'react';
import { SiteSettingsContext, type SiteSettingsContextType } from '@/contexts/SiteSettingsContext';
import { DEFAULT_SETTINGS } from '@/contexts/SiteSettingsContext';

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
