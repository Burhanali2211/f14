import { CircleHelp, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { KeyboardHelpDialogProps } from '../types';

export const KeyboardHelpDialog = ({ isOpen, onClose }: KeyboardHelpDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CircleHelp className="w-5 h-5 text-primary" />
              Keyboard Shortcuts
            </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            aria-label="Close keyboard shortcuts" 
            className="min-h-[44px] min-w-[44px] rounded-xl"
          >
            <XIcon className="w-5 h-5" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Navigation</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">New Recitation</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Ctrl+N</kbd>
              </div>
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Focus Search</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Ctrl+F</kbd>
              </div>
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Toggle Select Mode</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Ctrl+K</kbd>
              </div>
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Ctrl+/</kbd>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Actions</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Undo Delete</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Ctrl+U</kbd>
              </div>
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Delete Selected</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Delete</kbd>
              </div>
              <div className="flex justify-between items-center bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm">Close/Cancel</span>
                <kbd className="px-2 py-1 bg-background rounded text-xs font-mono border">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Note: On Mac, use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Cmd</kbd> instead of <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl</kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

