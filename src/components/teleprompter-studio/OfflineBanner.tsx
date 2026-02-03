import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-2 py-2 px-4",
        "bg-amber-500/90 text-amber-950 font-medium text-sm"
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You're offline. Drafts will be saved locally and synced when you're back online.</span>
    </div>
  );
}
