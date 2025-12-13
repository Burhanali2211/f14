import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFontSize } from '@/hooks/use-font-size';

export function FontControls() {
  const { fontSize, increaseFontSize, decreaseFontSize, resetFontSize } = useFontSize();

  return (
    <div className="flex items-center gap-1 bg-card rounded-lg p-1 shadow-soft">
      <Button
        variant="ghost"
        size="sm"
        onClick={decreaseFontSize}
        className="h-8 w-8 p-0 hover:bg-secondary"
        aria-label="Decrease font size"
      >
        <Minus className="w-4 h-4" />
      </Button>
      
      <span className="px-2 text-sm font-medium text-muted-foreground min-w-[40px] text-center">
        {fontSize}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={increaseFontSize}
        className="h-8 w-8 p-0 hover:bg-secondary"
        aria-label="Increase font size"
      >
        <Plus className="w-4 h-4" />
      </Button>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={resetFontSize}
        className="h-8 w-8 p-0 hover:bg-secondary"
        aria-label="Reset font size"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
