import { memo } from 'react';
import { AlertTriangle, Cloud, HardDrive, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface RecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localSegments: number;
  cloudSegments: number;
  localSavedAt: string | null;
  onRestoreLocal: () => void;
  onUseCloud: () => void;
  onDiscard: () => void;
}

function RecoveryDialogComponent({
  open,
  onOpenChange,
  localSegments,
  cloudSegments,
  localSavedAt,
  onRestoreLocal,
  onUseCloud,
  onDiscard,
}: RecoveryDialogProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Unsaved Work Found
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We found unsaved work from a previous session. What would you like to do?
              </p>

              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <HardDrive className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Local Draft
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {localSegments} segment{localSegments !== 1 ? 's' : ''} • Saved {formatDate(localSavedAt)}
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                      Not synced to cloud
                    </p>
                  </div>
                </div>

                {cloudSegments > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <Cloud className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Cloud Version
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {cloudSegments} segment{cloudSegments !== 1 ? 's' : ''} • Previously synced
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto text-destructive hover:text-destructive"
            onClick={() => {
              onDiscard();
              onOpenChange(false);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Discard Local
          </Button>

          <div className="flex-1" />

          {cloudSegments > 0 && (
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  onUseCloud();
                  onOpenChange(false);
                }}
              >
                <Cloud className="w-4 h-4 mr-1" />
                Use Cloud
              </Button>
            </AlertDialogCancel>
          )}

          <AlertDialogAction asChild>
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                onRestoreLocal();
                onOpenChange(false);
              }}
            >
              <HardDrive className="w-4 h-4 mr-1" />
              Restore Local
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const RecoveryDialog = memo(RecoveryDialogComponent);
