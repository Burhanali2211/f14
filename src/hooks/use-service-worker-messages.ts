import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth-utils';

export function useServiceWorkerMessages() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = async (event: MessageEvent) => {
      const { type, url } = event.data || {};

      switch (type) {
        case 'NAVIGATE':
          navigate(url);
          break;

        case 'APP_VERSION_CHECK': {
          const { getCurrentAppVersion, getStoredAppVersion, hasVersionChanged, clearAllCachesOnUpdate, storeAppVersion } = await import('@/lib/app-version');
          const currentVersion = await getCurrentAppVersion();
          const storedVersion = getStoredAppVersion();
          
          if (currentVersion && hasVersionChanged(currentVersion, storedVersion)) {
            await clearAllCachesOnUpdate();
            storeAppVersion(currentVersion);
            window.location.reload();
          }
          break;
        }

        case 'APP_UPDATE_AVAILABLE':
          logger.info('Update available message received from service worker:', event.data);
          break;

        case 'FORCE_APP_UPDATE': {
          logger.info('Force update message received from service worker');
          const { clearAllCachesOnUpdate } = await import('@/lib/app-version');
          await clearAllCachesOnUpdate();
          window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
          break;
        }

        case 'SERVICE_WORKER_ACTIVATED':
          logger.info('Service worker activated');
          break;

        case 'SUBSCRIBE_NOTIFICATIONS': {
          try {
            const user = getCurrentUser();
            if (user) {
              const { error } = await supabase
                .from('users')
                .update({ 
                  notifications_enabled: true,
                  notification_permission_granted: true 
                })
                .eq('id', user.id);
              
              if (!error) {
                toast({
                  title: 'Subscribed!',
                  description: 'You will receive notifications for this holy personality.',
                });
                navigate('/settings');
              } else {
                logger.error('Error updating notification preferences:', error);
                toast({
                  title: 'Error',
                  description: 'Could not update notification preferences.',
                  variant: 'destructive',
                });
              }
            } else {
              navigate('/auth');
            }
          } catch (error) {
            logger.error('Error handling subscription:', error);
            toast({
              title: 'Error',
              description: 'Could not process subscription request.',
              variant: 'destructive',
            });
          }
          break;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return null;
}
