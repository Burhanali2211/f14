import { memo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Keyboard,
  Eye,
  Upload,
  Smartphone,
  Music,
  X,
  Loader2,
  CheckCircle,
  Cloud,
  CloudOff,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface SaveStatus {
  isAutoSaving: boolean;
  isSyncingToCloud: boolean;
  lastLocalSave: Date | null;
  lastCloudSync: Date | null;
  hasUnsavedChanges: boolean;
  syncError: string | null;
}

interface EditorHeaderProps {
  pieceId: string;
  pieceTitle: string;
  hasChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  zoom: number;
  audioUrl?: string;
  audioFileName?: string;
  isUploading: boolean;
  saveStatus: SaveStatus;
  regionsCount: number;
  pages: string[];
  currentPageIndex: number;
  regionsPerPage: Map<number, number>;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (value: number) => void;
  onResetZoom: () => void;
  onPreview: () => void;
  onAudioUpload: (file: File) => void;
  onRemoveAudio: () => void;
  onAirSend: () => void;
  onPageChange: (index: number) => void;
  onSyncToCloud: () => void;
}

function EditorHeaderComponent({
  pieceId,
  pieceTitle,
  hasChanges,
  canUndo,
  canRedo,
  historyLength,
  zoom,
  audioUrl,
  audioFileName,
  isUploading,
  saveStatus,
  regionsCount,
  pages,
  currentPageIndex,
  regionsPerPage,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onResetZoom,
  onPreview,
  onAudioUpload,
  onRemoveAudio,
  onAirSend,
  onPageChange,
  onSyncToCloud,
}: EditorHeaderProps) {
  const navigate = useNavigate();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAudioInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAudioUpload(file);
      e.target.value = '';
    }
  }, [onAudioUpload]);

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderSaveStatus = () => {
    if (saveStatus.isAutoSaving) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="hidden sm:inline">Saving...</span>
        </div>
      );
    }

    if (saveStatus.syncError) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded text-xs text-destructive cursor-pointer" onClick={onSyncToCloud}>
              <CloudOff className="w-3 h-3" />
              <span className="hidden sm:inline">Sync failed</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{saveStatus.syncError}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to retry</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (saveStatus.isSyncingToCloud) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded text-xs text-blue-600">
          <Cloud className="w-3 h-3 animate-pulse" />
          <span className="hidden sm:inline">Syncing...</span>
        </div>
      );
    }

    if (saveStatus.lastCloudSync) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded text-xs text-green-600">
              <Cloud className="w-3 h-3" />
              <span className="hidden sm:inline">Synced {formatTime(saveStatus.lastCloudSync)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Last synced to cloud at {formatTime(saveStatus.lastCloudSync)}</p>
            {saveStatus.lastLocalSave && (
              <p className="text-xs text-muted-foreground">Local save: {formatTime(saveStatus.lastLocalSave)}</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (saveStatus.lastLocalSave) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="hidden sm:inline">{formatTime(saveStatus.lastLocalSave)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Saved locally at {formatTime(saveStatus.lastLocalSave)}</p>
            <p className="text-xs text-muted-foreground">Not synced to cloud yet</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return null;
  };

  const renderAudioIndicator = () => {
    if (!audioUrl) return null;

    return (
      <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/30 max-w-[200px]">
        <Music className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <span className="text-xs font-medium text-green-600 truncate">
          {audioFileName || 'Audio'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-destructive/20 flex-shrink-0"
          onClick={onRemoveAudio}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </Button>
      </div>
    );
  };

  const renderPageNavigation = () => {
    if (pages.length <= 1) return null;

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
          disabled={currentPageIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="hidden sm:flex items-center gap-0.5 max-w-[200px] overflow-x-auto">
          {pages.map((_, idx) => {
            const segmentCount = regionsPerPage.get(idx) || 0;
            const isActive = idx === currentPageIndex;

            return (
              <button
                key={idx}
                onClick={() => onPageChange(idx)}
                className={cn(
                  "relative min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                {idx + 1}
                {segmentCount > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold",
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    {segmentCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <span className="sm:hidden text-xs text-muted-foreground px-2">
          {currentPageIndex + 1}/{pages.length}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(Math.min(pages.length - 1, currentPageIndex + 1))}
          disabled={currentPageIndex === pages.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderZoomControls = () => (
    <div className="hidden lg:flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <div className="w-20 px-1">
        <Slider
          value={[zoom * 100]}
          min={25}
          max={400}
          step={5}
          onValueChange={([val]) => onZoomChange(val / 100)}
          className="cursor-pointer"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-1.5 font-mono text-xs min-w-[45px]"
        onClick={onResetZoom}
      >
        {Math.round(zoom * 100)}%
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onZoomIn}
            disabled={zoom >= 4}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </div>
  );

  const renderUndoRedo = () => (
    <div className="hidden sm:flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 relative"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="w-3.5 h-3.5" />
            {historyLength > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-[9px] font-bold">
                {historyLength}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>
    </div>
  );

  const renderMobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Editor Options</SheetTitle>
          <DialogDescription className="sr-only">
            Configuration options for the image segment editor, including audio upload and zoom controls.
          </DialogDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {audioUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Audio</p>
              <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                <Music className="w-4 h-4 text-green-500" />
                <span className="text-sm truncate flex-1">{audioFileName || 'Audio'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    onRemoveAudio();
                    setMobileMenuOpen(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Audio Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  audioInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAirSend();
                  setMobileMenuOpen(false);
                }}
                disabled={isUploading}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                AirSend
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Zoom: {Math.round(zoom * 100)}%</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomOut} disabled={zoom <= 0.25}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Slider
                value={[zoom * 100]}
                min={25}
                max={400}
                step={5}
                onValueChange={([val]) => onZoomChange(val / 100)}
                className="flex-1"
              />
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomIn} disabled={zoom >= 4}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={onResetZoom}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset Zoom
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">History</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onUndo} disabled={!canUndo}>
                <Undo2 className="w-4 h-4 mr-1" />
                Undo {historyLength > 0 && `(${historyLength})`}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onRedo} disabled={!canRedo}>
                <Redo2 className="w-4 h-4 mr-1" />
                Redo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Keyboard Shortcuts</p>
            <div className="text-xs space-y-1 text-muted-foreground bg-muted p-2 rounded">
              <p><kbd className="px-1 bg-background rounded">Space</kbd> Play/Pause</p>
              <p><kbd className="px-1 bg-background rounded">S</kbd> Set start time</p>
              <p><kbd className="px-1 bg-background rounded">E</kbd> Set end time</p>
              <p><kbd className="px-1 bg-background rounded">←/→</kbd> Seek ±1s</p>
              <p><kbd className="px-1 bg-background rounded">Ctrl+Z</kbd> Undo</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  const renderDesktopActions = () => (
    <div className="hidden md:flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={audioUrl ? "ghost" : "outline"} size="sm" className="h-7 gap-1.5 text-xs">
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Music className="w-3.5 h-3.5" />
            )}
            Audio
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => audioInputRef.current?.click()} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAirSend} disabled={isUploading}>
            <Smartphone className="w-4 h-4 mr-2" />
            AirSend from Phone
          </DropdownMenuItem>
          {audioUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemoveAudio} className="text-destructive" disabled={isUploading}>
                <X className="w-4 h-4 mr-2" />
                Remove Audio
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Keyboard className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p><kbd>Space</kbd> Play/Pause</p>
            <p><kbd>S</kbd> Set start • <kbd>E</kbd> Set end</p>
            <p><kbd>←/→</kbd> Seek ±1s</p>
            <p><kbd>Ctrl+Z</kbd> Undo</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {regionsCount > 0 && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onPreview}>
          <Eye className="w-3.5 h-3.5" />
          Preview
        </Button>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioInputChange}
        className="hidden"
        disabled={isUploading}
      />

      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-4 sm:py-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => navigate(`/piece/${pieceId}/teleprompter`)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Teleprompter</TooltipContent>
          </Tooltip>

          <div className="flex-1 min-w-0 mr-2">
            <h1 className="text-sm sm:text-base font-semibold truncate">{pieceTitle}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Image Segment Editor</p>
              {regionsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                  {regionsCount} segments
                </span>
              )}
            </div>
          </div>

          {renderSaveStatus()}
          {renderAudioIndicator()}
          {renderDesktopActions()}

          <Button
            onClick={onSave}
            disabled={!hasChanges}
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              hasChanges && "animate-pulse"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {renderMobileMenu()}
        </div>
      </header>
    </TooltipProvider>
  );
}

export const EditorHeader = memo(EditorHeaderComponent);
