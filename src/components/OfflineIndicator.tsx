'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { onNetworkChange, getNetworkInfo } from '@/lib/cache';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [networkStatus, setNetworkStatus] = useState(getNetworkInfo());
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = onNetworkChange((info) => {
      if (networkStatus.status === 'offline' && info.status !== 'offline') {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
      
      if (info.status === 'offline') {
        setWasOffline(true);
      }
      
      setNetworkStatus(info);
    });

    return unsubscribe;
  }, [networkStatus.status]);

  if (networkStatus.status === 'offline') {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline</span>
        </div>
      </div>
    );
  }

  if (networkStatus.status === 'slow') {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Slow connection</span>
        </div>
      </div>
    );
  }

  if (showReconnected && wasOffline) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online</span>
        </div>
      </div>
    );
  }

  return null;
}
