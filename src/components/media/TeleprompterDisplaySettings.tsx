import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type HighlightMode = 'background' | 'border' | 'scale' | 'glow';
export type ScrollBehavior = 'smooth' | 'instant';

interface TeleprompterDisplaySettingsProps {
  fontSize: number;
  onFontSizeChange: (value: number) => void;
  imageZoom: number;
  onImageZoomChange: (value: number) => void;
  highlightMode: HighlightMode;
  onHighlightModeChange: (value: HighlightMode) => void;
  scrollBehavior?: ScrollBehavior;
  onScrollBehaviorChange?: (value: ScrollBehavior) => void;
  variant?: 'default' | 'playback';
}

export function TeleprompterDisplaySettings({
  fontSize,
  onFontSizeChange,
  imageZoom,
  onImageZoomChange,
  highlightMode,
  onHighlightModeChange,
  scrollBehavior,
  onScrollBehaviorChange,
  variant = 'default',
}: TeleprompterDisplaySettingsProps) {
  const showScrollBehavior = scrollBehavior !== undefined && onScrollBehaviorChange;

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Display Settings</h4>

      <div>
        <label className="text-sm text-muted-foreground">Font Size: {fontSize}px</label>
        <Slider
          value={[fontSize]}
          onValueChange={([v]) => onFontSizeChange(v)}
          min={16}
          max={48}
          step={2}
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Zoom: {imageZoom}%</label>
        <Slider
          value={[imageZoom]}
          onValueChange={([v]) => onImageZoomChange(v)}
          min={50}
          max={200}
          step={10}
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Highlight Style</label>
        <Select value={highlightMode} onValueChange={(v) => onHighlightModeChange(v as HighlightMode)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="background">Background</SelectItem>
            <SelectItem value="border">Border</SelectItem>
            <SelectItem value="scale">Scale</SelectItem>
            <SelectItem value="glow">Glow</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showScrollBehavior && (
        <div>
          <label className="text-sm text-muted-foreground">Scroll Behavior</label>
          <Select value={scrollBehavior} onValueChange={(v) => onScrollBehaviorChange(v as ScrollBehavior)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smooth">Smooth</SelectItem>
              <SelectItem value="instant">Instant</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
