import { memo } from 'react';
import { 
  Save, Undo2, Redo2, ZoomIn, ZoomOut, RotateCcw, 
  LayoutGrid, Image, Keyboard, GripHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  zoom: number;
  viewMode: 'image' | 'timeline';
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleViewMode: () => void;
}

function ToolbarComponent({
  hasChanges,
  canUndo,
  canRedo,
  historyLength,
  zoom,
  viewMode,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleViewMode,
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <GripHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Drag to create segments</span>
          </div>

          <div className="flex items-center gap-1 border-l pl-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="w-4 h-4" />
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
                  className="h-8 w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1 border-l pl-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={onZoomOut}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (Ctrl+-)</TooltipContent>
            </Tooltip>

            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 font-mono text-xs min-w-[60px]"
              onClick={onResetZoom}
            >
              {Math.round(zoom * 100)}%
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={onZoomIn}
                  disabled={zoom >= 4}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (Ctrl++)</TooltipContent>
            </Tooltip>

            {zoom !== 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={onResetZoom}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Zoom (Ctrl+0)</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1 border-l pl-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'image' ? 'secondary' : 'ghost'}
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => viewMode !== 'image' && onToggleViewMode()}
                >
                  <Image className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Image View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => viewMode !== 'timeline' && onToggleViewMode()}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Timeline View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                <Keyboard className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="text-xs space-y-1">
                <p><kbd>Space</kbd> Play/Pause</p>
                <p><kbd>S</kbd> Set start time</p>
                <p><kbd>E</kbd> Set end time</p>
                  <p><kbd>←/→</kbd> Seek ±1s</p>
                  <p><kbd>Shift+←/→</kbd> Seek ±5s</p>
                  <p><kbd>Ctrl+Z</kbd> Undo</p>
                </div>
            </TooltipContent>
          </Tooltip>

          <Button 
            onClick={onSave} 
            disabled={!hasChanges} 
            size="sm"
            className={cn(
              "transition-all",
              hasChanges && "animate-pulse"
            )}
          >
            <Save className="w-4 h-4 mr-1" />
            Save All
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const Toolbar = memo(ToolbarComponent);
