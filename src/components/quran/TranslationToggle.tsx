import { useState } from 'react';
import { Eye, EyeOff, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TranslationToggleProps {
  showUrdu: boolean;
  showEnglish: boolean;
  onToggleUrdu: () => void;
  onToggleEnglish: () => void;
}

export function TranslationToggle({
  showUrdu,
  showEnglish,
  onToggleUrdu,
  onToggleEnglish,
}: TranslationToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-xl">
        <Button
          variant={showUrdu ? 'default' : 'ghost'}
          size="sm"
          onClick={onToggleUrdu}
          className="gap-2 rounded-lg"
        >
          {showUrdu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="font-arabic text-sm">اردو</span>
        </Button>
        
        <Button
          variant={showEnglish ? 'default' : 'ghost'}
          size="sm"
          onClick={onToggleEnglish}
          className="gap-2 rounded-lg"
        >
          {showEnglish ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>English</span>
        </Button>
      </div>
    </div>
  );
}
