import { useCallback, useRef } from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  label: string;
  minutes: string;
  seconds: string;
  centiseconds: string;
  onMinutesChange: (value: string) => void;
  onSecondsChange: (value: string) => void;
  onCentisecondsChange: (value: string) => void;
  onCaptureTime?: () => void;
  onAdjust?: (delta: number) => void;
  currentTime?: number;
  showCapture?: boolean;
  showSlider?: boolean;
  sliderMin?: number;
  sliderMax?: number;
  onSliderChange?: (value: number) => void;
  onSave?: () => void;
}

export function TimeInput({
  label,
  minutes,
  seconds,
  centiseconds,
  onMinutesChange,
  onSecondsChange,
  onCentisecondsChange,
  onCaptureTime,
  onAdjust,
  currentTime,
  showCapture = true,
  showSlider = false,
  sliderMin = 0,
  sliderMax = 300,
  onSliderChange,
  onSave,
}: TimeInputProps) {
  const minRef = useRef<HTMLInputElement>(null);
  const secRef = useRef<HTMLInputElement>(null);
  const msRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'min' | 'sec' | 'ms'
  ) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (field === 'ms') {
          secRef.current?.focus();
          secRef.current?.select();
        } else if (field === 'sec') {
          minRef.current?.focus();
          minRef.current?.select();
        }
      } else {
        if (field === 'min') {
          secRef.current?.focus();
          secRef.current?.select();
        } else if (field === 'sec') {
          msRef.current?.focus();
          msRef.current?.select();
        }
      }
    } else if (e.key === 'Enter' && onSave) {
      onSave();
    } else if (e.key === 'ArrowUp' && onAdjust) {
      e.preventDefault();
      onAdjust(0.1);
    } else if (e.key === 'ArrowDown' && onAdjust) {
      e.preventDefault();
      onAdjust(-0.1);
    }
  }, [onSave, onAdjust]);

  const currentValue = currentTime !== undefined
    ? parseInt(minutes || '0') * 60 + parseInt(seconds || '0') + parseInt(centiseconds || '0') / 100
    : 0;

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
        {label}
      </label>
      
      <div className="flex items-center gap-1.5">
        <div className="flex items-center bg-muted/50 rounded-lg px-2 border border-border focus-within:border-primary transition-colors flex-1">
          <input
            ref={minRef}
            value={minutes}
            onChange={(e) => onMinutesChange(e.target.value.slice(0, 2))}
            onKeyDown={(e) => handleKeyDown(e, 'min')}
            onFocus={(e) => e.target.select()}
            className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
            placeholder="00"
            maxLength={2}
          />
          <span className="text-muted-foreground">:</span>
          <input
            ref={secRef}
            value={seconds}
            onChange={(e) => onSecondsChange(e.target.value.slice(0, 2))}
            onKeyDown={(e) => handleKeyDown(e, 'sec')}
            onFocus={(e) => e.target.select()}
            className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
            placeholder="00"
            maxLength={2}
          />
          <span className="text-muted-foreground">.</span>
          <input
            ref={msRef}
            value={centiseconds}
            onChange={(e) => onCentisecondsChange(e.target.value.slice(0, 2))}
            onKeyDown={(e) => handleKeyDown(e, 'ms')}
            onFocus={(e) => e.target.select()}
            className="w-8 bg-transparent border-none text-center font-mono text-sm focus:outline-none py-2"
            placeholder="00"
            maxLength={2}
          />
        </div>

        {onAdjust && (
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-6 rounded"
              onClick={() => onAdjust(0.1)}
              title="+100ms"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-6 rounded"
              onClick={() => onAdjust(-0.1)}
              title="-100ms"
            >
              <Minus className="w-3 h-3" />
            </Button>
          </div>
        )}

        {showCapture && onCaptureTime && (
          <Button
            variant="outline"
            size="icon"
            onClick={onCaptureTime}
            title="Capture current time"
            className="shrink-0 h-9 w-9 rounded-lg"
          >
            <Clock className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showSlider && onSliderChange && (
        <div className="pt-1">
          <Slider
            value={[currentValue]}
            min={sliderMin}
            max={sliderMax}
            step={0.1}
            onValueChange={([value]) => onSliderChange(value)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{Math.floor(sliderMin / 60)}:{(sliderMin % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(sliderMax / 60)}:{(sliderMax % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
