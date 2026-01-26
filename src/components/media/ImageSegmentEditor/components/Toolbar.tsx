import { memo } from 'react';
import { 
  Save, Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, 
  Keyboard, GripHorizontal, Link2, Link2Off 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  zoom: number;
  chainTimes: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomChange?: (zoom: number) => void;
  onToggleChainTimes: () => void;
}

function ToolbarComponent({
  hasChanges,
  canUndo,
  canRedo,
  historyLength,
  zoom,
  chainTimes,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onZoomChange,
  onToggleChainTimes,
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-4 sm:py-2.5 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <GripHorizontal className="w-4 h-4" />
            <span className="hidden md:inline">Drag to create</span>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
                {historyLength > 0 && <p className="text-xs opacity-70">{historyLength} actions</p>}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={onZoomOut}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            {onZoomChange && (
              <div className="hidden lg:flex items-center w-20">
                <Slider
                  value={[zoom * 100]}
                  min={25}
                  max={400}
                  step={25}
                  onValueChange={([v]) => onZoomChange(v / 100)}
                  className="cursor-pointer"
                />
              </div>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 sm:h-8 px-1.5 sm:px-2 font-mono text-[10px] sm:text-xs min-w-[40px] sm:min-w-[50px]"
              onClick={onResetZoom}
            >
              {Math.round(zoom * 100)}%
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={onZoomIn}
                  disabled={zoom >= 4}
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            {zoom !== 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:inline-flex"
                    onClick={onResetZoom}
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Zoom</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="h-4 w-px bg-border shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={chainTimes ? 'default' : 'ghost'}
                size="sm" 
                className={cn(
                  "h-7 sm:h-8 gap-1 px-2 sm:px-2.5 shrink-0",
                  chainTimes && "bg-primary text-primary-foreground"
                )}
                onClick={onToggleChainTimes}
              >
                {chainTimes ? <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Link2Off className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="text-[10px] sm:text-xs">Chain</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">Chain Segment Times</p>
              <p className="text-xs opacity-80 mt-1">
                When ON, changing end time shifts all following segments
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden md:inline-flex">
                <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-xs space-y-1">
                <p><kbd>Space</kbd> Play/Pause</p>
                <p><kbd>S</kbd> Set start time</p>
                <p><kbd>E</kbd> Set end time</p>
                <p><kbd>←/→</kbd> Seek ±1s</p>
                <p><kbd>Ctrl+Z</kbd> Undo</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Button 
            onClick={onSave} 
            disabled={!hasChanges} 
            size="sm"
            className={cn(
              "h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm transition-all gap-1",
              hasChanges && "animate-pulse"
            )}
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Save</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const Toolbar = memo(ToolbarComponent);
