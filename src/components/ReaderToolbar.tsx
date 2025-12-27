import { Link } from 'react-router-dom';
import { 
  Minus, Plus, RotateCcw, Copy, Share2, Heart, 
  Settings, ChevronLeft, ChevronRight,
  Printer, MoreVertical, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/hooks/use-settings';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReaderToolbarProps {
  pieceId: string;
  pieceTitle: string;
  textContent: string;
  onSettingsOpen: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  category?: {
    name: string;
    slug: string;
  } | null;
}

export function ReaderToolbar({
  pieceId,
  pieceTitle,
  textContent,
  onSettingsOpen,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  category = null,
}: ReaderToolbarProps) {
  const { settings, updateSetting } = useSettings();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorite = isFavorite(pieceId);
  const isMobile = useIsMobile();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(textContent);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pieceTitle,
          text: `Read "${pieceTitle}" on Kalam Reader`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  const handleFavorite = () => {
    if (favorite) {
      removeFavorite(pieceId);
      toast({ title: "Removed from favorites" });
    } else {
      addFavorite(pieceId);
      toast({ title: "Added to favorites" });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const decreaseFontSize = () => {
    updateSetting('fontSize', Math.max(16, settings.fontSize - 2));
  };

  const increaseFontSize = () => {
    updateSetting('fontSize', Math.min(40, settings.fontSize + 2));
  };

  const resetFontSize = () => {
    // Keep toolbar reset in sync with defaultSettings in use-settings
    updateSetting('fontSize', 24);
    updateSetting('lineHeight', 2.2);
  };

  // Mobile layout - single compact row with dropdown menu
  if (isMobile) {
    return (
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border print:hidden">
        <div className="container max-w-4xl flex items-center gap-2 px-3 py-2.5">
          {/* Breadcrumb - Left side - Back button */}
          {category ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
            >
              <Link to={`/category/${category.slug}`}>
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="ml-0.5 sm:ml-1">
                  <span className="hidden sm:inline">Back to </span>
                  <span className="truncate max-w-[60px] sm:max-w-none">{category.name}</span>
                </span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
              aria-label="Back to home"
            >
              <Link to="/">
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1 hidden sm:inline">Home</span>
              </Link>
            </Button>
          )}

          <Separator orientation="vertical" className="h-5" />

          {/* Navigation arrows - compact */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="h-9 w-9"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="h-9 w-9"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Font Controls - compact */}
          <div className="flex items-center gap-0.5 bg-card rounded-md px-1 py-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={decreaseFontSize}
              className="h-8 w-8"
              aria-label="Decrease font"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            
            <span className="px-1.5 text-xs font-medium text-foreground min-w-[32px] text-center">
              {settings.fontSize}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={increaseFontSize}
              className="h-8 w-8"
              aria-label="Increase font"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Essential actions - visible */}
          <div className="flex items-center gap-0.5 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavorite}
              className={`h-9 w-9 ${favorite ? 'text-red-500' : ''}`}
              aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-current' : ''}`} />
            </Button>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSettingsOpen}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetFontSize}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset font
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout - clean single row with integrated breadcrumb
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border py-2 print:hidden">
      <div className="container max-w-4xl flex items-center gap-3">
        {/* Breadcrumb - Left side - Back button */}
        {category ? (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
          >
            <Link to={`/category/${category.slug}`}>
              <ChevronLeft className="w-4 h-4" />
              <span className="ml-1">Back to {category.name}</span>
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent flex-shrink-0"
            aria-label="Back to home"
          >
            <Link to="/">
              <Home className="w-4 h-4" />
              <span className="ml-1">Home</span>
            </Link>
          </Button>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous recitation</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={!hasNext}
                className="h-9 w-9"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next recitation</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Font Controls */}
        <div className="flex items-center gap-1 bg-card rounded-lg p-1 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={decreaseFontSize}
                className="h-8 w-8"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Decrease font size</TooltipContent>
          </Tooltip>
          
          <span className="px-2 text-sm font-medium text-muted-foreground min-w-[40px] text-center">
            {settings.fontSize}
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={increaseFontSize}
                className="h-8 w-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Increase font size</TooltipContent>
          </Tooltip>
          
          <Separator orientation="vertical" className="h-6 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFontSize}
                className="h-8 w-8"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset font size</TooltipContent>
          </Tooltip>
        </div>

        {/* Actions - Right side */}
        <div className="flex items-center gap-1 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-9 w-9"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy text</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavorite}
                className={`h-9 w-9 ${favorite ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${favorite ? 'fill-current' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{favorite ? 'Remove from favorites' : 'Add to favorites'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-9 w-9"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                className="h-9 w-9"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsOpen}
                className="h-9 w-9"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
