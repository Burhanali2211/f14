import { memo } from 'react';
import { Edit2, Trash2, Loader2, CheckSquare, Square, Copy, MoreVertical, Clock, Eye } from 'lucide-react';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getKarbalaPlaceholder, getFirstImageUrl, getProxiedImageUrl } from '@/lib/utils';
import type { PieceCardProps } from './types';

export const PieceCard = memo(({ 
  piece, 
  category, 
  imam, 
  isDeleting, 
  isSelected, 
  selectMode, 
  onEdit, 
  onDelete, 
  onImageClick, 
  onToggleSelect, 
  onCopyUrl, 
  onView 
}: PieceCardProps) => {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden w-full max-w-full ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'}`}>
      {selectMode && (
        <button
          onClick={() => onToggleSelect(piece.id)}
          className="p-2 hover:bg-secondary rounded-lg transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center flex-shrink-0"
          aria-label={isSelected ? `Deselect ${piece.title}` : `Select ${piece.title}`}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      )}
      <div 
        className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 cursor-pointer overflow-hidden"
        onClick={() => {
          if (!selectMode) {
            const firstImage = getFirstImageUrl(piece.image_url);
            onImageClick(firstImage || getKarbalaPlaceholder(piece.id));
          }
        }}
      >
        <img 
          src={getProxiedImageUrl(getFirstImageUrl(piece.image_url)) || getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0 border border-border"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{piece.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
            {piece.view_count > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full flex-shrink-0">
                <Eye className="w-3 h-3" />
                {piece.view_count}
              </span>
            )}
            {piece.updated_at && piece.updated_at !== piece.created_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full flex-shrink-0" title={`Last edited: ${new Date(piece.updated_at).toLocaleDateString()}`}>
                <Clock className="w-3 h-3" />
                Edited
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {!selectMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl"
                aria-label="More options"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(piece)} className="gap-2">
                <Eye className="w-4 h-4" />
                View Recitation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(piece)} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyUrl(piece)} className="gap-2">
                <Copy className="w-4 h-4" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(piece)}
                className="text-destructive focus:text-destructive gap-2"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {selectMode && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(piece);
                    }}
                    aria-label={`Edit ${piece.title}`}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation rounded-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit recitation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(piece);
                    }}
                    disabled={isDeleting}
                    aria-label={`Delete ${piece.title}`}
                    className="h-11 w-11 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation rounded-xl"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete recitation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.piece.id === nextProps.piece.id &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectMode === nextProps.selectMode &&
    prevProps.category?.id === nextProps.category?.id &&
    prevProps.imam?.id === nextProps.imam?.id
  );
});

PieceCard.displayName = 'PieceCard';

