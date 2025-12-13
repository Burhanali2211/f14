import { useState } from 'react';
import { 
  Minus, Plus, RotateCcw, Copy, Share2, Heart, 
  Bookmark, Settings, ChevronLeft, ChevronRight,
  Download, Printer, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSettings } from '@/hooks/use-settings';
import { useFavorites } from '@/hooks/use-favorites';
import { toast } from '@/hooks/use-toast';

interface ReaderToolbarProps {
  pieceId: string;
  pieceTitle: string;
  textContent: string;
  onSettingsOpen: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
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
}: ReaderToolbarProps) {
  const { settings, updateSetting } = useSettings();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorite = isFavorite(pieceId);

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
    updateSetting('fontSize', 24);
  };

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border py-2 print:hidden">
      <div className="container max-w-4xl flex items-center justify-between gap-2">
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

        {/* Actions */}
        <div className="flex items-center gap-1">
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
                className="h-9 w-9 hidden sm:inline-flex"
              >
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

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
