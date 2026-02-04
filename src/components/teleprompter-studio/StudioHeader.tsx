import { useState } from 'react';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AirSendDialog } from '@/components/media/AirSendDialog';

interface StudioHeaderProps {
  title: string;
  pieceId?: string | null;
  onBack: () => void;
}

export function StudioHeader({ title, pieceId, onBack }: StudioHeaderProps) {
  const [showAirSend, setShowAirSend] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 min-h-[4rem] py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 sm:h-11 sm:w-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-accent/50 shrink-0 touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0">{title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAirSend(true)}
          className="gap-1.5 shrink-0 h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm"
          title="AirSend from phone"
        >
          <Smartphone className="w-4 h-4" />
          <span className="hidden sm:inline">AirSend</span>
        </Button>
      </div>
      <AirSendDialog
        open={showAirSend}
        onOpenChange={setShowAirSend}
        pieceId={pieceId ?? null}
        mode="download-only"
      />
    </header>
  );
}
