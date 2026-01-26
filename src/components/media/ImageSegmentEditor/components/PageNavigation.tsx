import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageNavigationProps {
  pages: string[];
  currentPageIndex: number;
  regionsPerPage: Map<number, number>;
  onPageChange: (index: number) => void;
}

function PageNavigationComponent({
  pages,
  currentPageIndex,
  regionsPerPage,
  onPageChange,
}: PageNavigationProps) {
  if (pages.length <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3 border-b bg-muted/20">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
        disabled={currentPageIndex === 0}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1 px-2 overflow-x-auto max-w-[calc(100%-120px)]">
        {pages.map((_, idx) => {
          const segmentCount = regionsPerPage.get(idx) || 0;
          const isActive = idx === currentPageIndex;
          
          return (
            <button
              key={idx}
              onClick={() => onPageChange(idx)}
              className={cn(
                "relative min-w-[40px] h-8 px-2 rounded-md text-xs font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {idx + 1}
              {segmentCount > 0 && (
                <span 
                  className={cn(
                    "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold",
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

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(Math.min(pages.length - 1, currentPageIndex + 1))}
        disabled={currentPageIndex === pages.length - 1}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">
        Page {currentPageIndex + 1} of {pages.length}
      </span>
    </div>
  );
}

export const PageNavigation = memo(PageNavigationComponent);
