import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Status = 'synced' | 'saving' | 'offline' | 'pending-sync';

interface DraftStatusBarProps {
  status: Status;
  lastSaved?: Date | null;
  onSync?: () => void;
  className?: string;
}

export function DraftStatusBar({ status, lastSaved, onSync, className }: DraftStatusBarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const label =
    status === 'synced'
      ? 'Synced'
      : status === 'saving'
        ? 'Saving...'
        : status === 'offline'
          ? 'Offline - draft saved locally'
          : 'Pending sync';

  const Icon =
    status === 'synced'
      ? CheckCircle
      : status === 'saving'
        ? Loader2
        : status === 'offline'
          ? CloudOff
          : Cloud;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        status === 'synced' && "bg-green-500/10 text-green-600 border border-green-500/20",
        status === 'saving' && "bg-primary/10 text-primary border border-primary/20",
        status === 'offline' && "bg-amber-500/10 text-amber-600 border border-amber-500/20",
        status === 'pending-sync' && "bg-muted text-muted-foreground border border-border",
        className
      )}
    >
      {status === 'saving' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{label}</span>
      {lastSaved && status === 'synced' && (
        <span className="opacity-70">
          {lastSaved.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {status === 'pending-sync' && onSync && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onSync}>
          Sync
        </Button>
      )}
    </div>
  );
}
