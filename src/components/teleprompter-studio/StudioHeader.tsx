import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudioHeaderProps {
  title: string;
  pieceId?: string | null;
  onBack: () => void;
}

export function StudioHeader({ title, onBack }: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-[1600px] mx-auto px-4 min-h-[4rem] py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-accent/50 shrink-0 touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold truncate flex-1">{title}</h1>
      </div>
    </header>
  );
}
