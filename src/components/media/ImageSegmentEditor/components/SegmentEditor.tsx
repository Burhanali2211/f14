import { useState, useCallback, useEffect } from 'react';
import { Trash2, Check, Play, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeInput } from './TimeInput';
import type { ImageRegion, SegmentFormData } from '../types';
import { formatTimeParts, parseTimeParts, formatTimeDisplay } from '../types';

interface SegmentEditorProps {
  region: ImageRegion;
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  onSave: (updates: Partial<ImageRegion>) => void;
  onDelete: () => void;
  onCancel: () => void;
  onPlayRegion: () => void;
  onCopy: () => void;
}

export function SegmentEditor({
  region,
  currentTime,
  duration,
  hasAudio,
  onSave,
  onDelete,
  onCancel,
  onPlayRegion,
  onCopy,
}: SegmentEditorProps) {
  const [form, setForm] = useState<SegmentFormData>(() => {
    const start = formatTimeParts(region.startTime);
    const end = formatTimeParts(region.endTime);
    return {
      label: region.label || '',
      startMM: start.mm,
      startSS: start.ss,
      startCC: start.cc,
      endMM: end.mm,
      endSS: end.ss,
      endCC: end.cc,
    };
  });

  useEffect(() => {
    const start = formatTimeParts(region.startTime);
    const end = formatTimeParts(region.endTime);
    setForm({
      label: region.label || '',
      startMM: start.mm,
      startSS: start.ss,
      startCC: start.cc,
      endMM: end.mm,
      endSS: end.ss,
      endCC: end.cc,
    });
  }, [region]);

  const handleSave = useCallback(() => {
    const startTime = parseTimeParts(form.startMM, form.startSS, form.startCC);
    const endTime = parseTimeParts(form.endMM, form.endSS, form.endCC);

    if (endTime <= startTime) return;

    onSave({
      label: form.label || undefined,
      startTime,
      endTime,
    });
  }, [form, onSave]);

  const captureStartTime = useCallback(() => {
    const parts = formatTimeParts(currentTime);
    setForm(prev => ({
      ...prev,
      startMM: parts.mm,
      startSS: parts.ss,
      startCC: parts.cc,
    }));
  }, [currentTime]);

  const captureEndTime = useCallback(() => {
    const parts = formatTimeParts(currentTime);
    setForm(prev => ({
      ...prev,
      endMM: parts.mm,
      endSS: parts.ss,
      endCC: parts.cc,
    }));
  }, [currentTime]);

  const adjustStartTime = useCallback((delta: number) => {
    const currentStart = parseTimeParts(form.startMM, form.startSS, form.startCC);
    const newStart = Math.max(0, currentStart + delta);
    const parts = formatTimeParts(newStart);
    setForm(prev => ({
      ...prev,
      startMM: parts.mm,
      startSS: parts.ss,
      startCC: parts.cc,
    }));
  }, [form]);

  const adjustEndTime = useCallback((delta: number) => {
    const currentEnd = parseTimeParts(form.endMM, form.endSS, form.endCC);
    const newEnd = Math.max(0, currentEnd + delta);
    const parts = formatTimeParts(newEnd);
    setForm(prev => ({
      ...prev,
      endMM: parts.mm,
      endSS: parts.ss,
      endCC: parts.cc,
    }));
  }, [form]);

  const handleSliderChange = useCallback((field: 'start' | 'end', value: number) => {
    const parts = formatTimeParts(value);
    if (field === 'start') {
      setForm(prev => ({
        ...prev,
        startMM: parts.mm,
        startSS: parts.ss,
        startCC: parts.cc,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        endMM: parts.mm,
        endSS: parts.ss,
        endCC: parts.cc,
      }));
    }
  }, []);

  const segmentDuration = parseTimeParts(form.endMM, form.endSS, form.endCC) - 
                          parseTimeParts(form.startMM, form.startSS, form.startCC);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Edit Segment</h3>
        <div className="flex items-center gap-1">
          {hasAudio && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPlayRegion}
              title="Play this segment"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCopy}
            title="Copy segment"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete segment"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Segment Name</Label>
        <Input
          value={form.label}
          onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., Verse 1, Para 3..."
          className="mt-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      </div>

      <TimeInput
        label="Start Time (MM:SS.CC)"
        minutes={form.startMM}
        seconds={form.startSS}
        centiseconds={form.startCC}
        onMinutesChange={(v) => setForm(prev => ({ ...prev, startMM: v }))}
        onSecondsChange={(v) => setForm(prev => ({ ...prev, startSS: v }))}
        onCentisecondsChange={(v) => setForm(prev => ({ ...prev, startCC: v }))}
        onCaptureTime={hasAudio ? captureStartTime : undefined}
        onAdjust={adjustStartTime}
        showCapture={hasAudio}
        onSave={handleSave}
      />

      <TimeInput
        label="End Time (MM:SS.CC)"
        minutes={form.endMM}
        seconds={form.endSS}
        centiseconds={form.endCC}
        onMinutesChange={(v) => setForm(prev => ({ ...prev, endMM: v }))}
        onSecondsChange={(v) => setForm(prev => ({ ...prev, endSS: v }))}
        onCentisecondsChange={(v) => setForm(prev => ({ ...prev, endCC: v }))}
        onCaptureTime={hasAudio ? captureEndTime : undefined}
        onAdjust={adjustEndTime}
        showCapture={hasAudio}
        onSave={handleSave}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Duration:</span>
        <span className="font-mono font-medium">
          {segmentDuration > 0 ? formatTimeDisplay(segmentDuration) : '--:--'}
        </span>
      </div>

      {hasAudio && (
        <p className="text-xs text-muted-foreground text-center py-2 bg-muted rounded">
          Current: <span className="font-mono">{formatTimeDisplay(currentTime)}</span>
          <span className="mx-2 opacity-50">|</span>
          Press <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px]">S</kbd> for start,{' '}
          <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px]">E</kbd> for end
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          className="flex-1" 
          onClick={handleSave}
          disabled={segmentDuration <= 0}
        >
          <Check className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
