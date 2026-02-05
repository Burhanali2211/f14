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

/** Content type determines which settings are shown. */
export type TeleprompterContentType = 'images' | 'segments' | 'text' | 'pdf' | 'empty';

interface TeleprompterDisplaySettingsProps {
  fontSize: number;
  onFontSizeChange: (value: number) => void;
  imageZoom: number;
  onImageZoomChange: (value: number) => void;
  highlightMode: HighlightMode;
  onHighlightModeChange: (value: HighlightMode) => void;
  scrollBehavior?: ScrollBehavior;
  onScrollBehaviorChange?: (value: ScrollBehavior) => void;
  /** When set, only shows settings relevant to this content type. Omit to show all (legacy/default). */
  contentType?: TeleprompterContentType;
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
  contentType,
  variant = 'default',
}: TeleprompterDisplaySettingsProps) {
  const showScrollBehavior = scrollBehavior !== undefined && onScrollBehaviorChange;

  // When contentType is set, show only relevant settings
  const showFontSize = !contentType || contentType === 'segments' || contentType === 'text';
  const showImageZoom = !contentType || contentType === 'images' || contentType === 'pdf';
  const showHighlightStyle = !contentType || contentType === 'images' || contentType === 'segments';
  const showScroll = showScrollBehavior && (!contentType || contentType === 'segments' || contentType === 'text' || contentType === 'pdf');

  return (
    <div className="space-y-4">
      <h4 className="font-medium">Display Settings</h4>

      {showFontSize && (
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
      )}

      {showImageZoom && (
        <div>
          <label className="text-sm text-muted-foreground">
            {contentType === 'images' ? 'Region Zoom' : 'Zoom'}: {imageZoom}%
          </label>
          <Slider
            value={[imageZoom]}
            onValueChange={([v]) => onImageZoomChange(v)}
            min={50}
            max={200}
            step={10}
            className="mt-2"
          />
        </div>
      )}

      {showHighlightStyle && (
        <div>
          <label className="text-sm text-muted-foreground">
            {contentType === 'images' ? 'Region Highlight' : 'Highlight Style'}
          </label>
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
      )}

      {showScroll && (
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
