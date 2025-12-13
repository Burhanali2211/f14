import { X, RotateCcw, Type, Eye, Volume2, Palette, Accessibility } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/hooks/use-settings';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-xl">Settings</SheetTitle>
            <Button variant="ghost" size="sm" onClick={resetSettings} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="reading" className="mt-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="reading" className="text-xs">
              <Type className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="display" className="text-xs">
              <Eye className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-xs">
              <Volume2 className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-xs">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          {/* Reading Settings */}
          <TabsContent value="reading" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                Typography
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Font Size: {settings.fontSize}px</Label>
                </div>
                <Slider
                  value={[settings.fontSize]}
                  min={16}
                  max={40}
                  step={2}
                  onValueChange={([v]) => updateSetting('fontSize', v)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Height: {settings.lineHeight.toFixed(1)}</Label>
                </div>
                <Slider
                  value={[settings.lineHeight]}
                  min={1.5}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => updateSetting('lineHeight', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(v) => updateSetting('fontFamily', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amiri">Amiri (Classic)</SelectItem>
                    <SelectItem value="noto-nastaliq">Noto Nastaliq (Urdu)</SelectItem>
                    <SelectItem value="scheherazade">Scheherazade (Arabic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Text Alignment</Label>
                <Select
                  value={settings.textAlign}
                  onValueChange={(v) => updateSetting('textAlign', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right (RTL)</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="justify">Justify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Display Options
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Verse Numbers</Label>
                  <p className="text-xs text-muted-foreground">Display numbers before each verse</p>
                </div>
                <Switch
                  checked={settings.showVerseNumbers}
                  onCheckedChange={(v) => updateSetting('showVerseNumbers', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Highlight Current Verse</Label>
                  <p className="text-xs text-muted-foreground">Highlight while audio plays</p>
                </div>
                <Switch
                  checked={settings.highlightCurrentVerse}
                  onCheckedChange={(v) => updateSetting('highlightCurrentVerse', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Scroll with Audio</Label>
                  <p className="text-xs text-muted-foreground">Scroll to current verse while playing</p>
                </div>
                <Switch
                  checked={settings.autoScrollWhilePlaying}
                  onCheckedChange={(v) => updateSetting('autoScrollWhilePlaying', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">Reduce spacing for more content</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting('compactMode', v)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Audio Settings */}
          <TabsContent value="audio" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                Audio Playback
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Playback Speed: {settings.playbackSpeed}x</Label>
                </div>
                <Slider
                  value={[settings.playbackSpeed]}
                  min={0.5}
                  max={2}
                  step={0.25}
                  onValueChange={([v]) => updateSetting('playbackSpeed', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Play Next</Label>
                  <p className="text-xs text-muted-foreground">Play next recitation automatically</p>
                </div>
                <Switch
                  checked={settings.autoPlayNext}
                  onCheckedChange={(v) => updateSetting('autoPlayNext', v)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Repeat Mode</Label>
                <Select
                  value={settings.repeatMode}
                  onValueChange={(v) => updateSetting('repeatMode', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Repeat</SelectItem>
                    <SelectItem value="one">Repeat One</SelectItem>
                    <SelectItem value="all">Repeat All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Appearance
              </h3>

              <div className="space-y-2">
                <Label>Reader Background</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['default', 'sepia', 'dark', 'paper'] as const).map((bg) => (
                    <button
                      key={bg}
                      onClick={() => updateSetting('readerBackground', bg)}
                      className={`h-12 rounded-lg border-2 transition-all ${
                        settings.readerBackground === bg 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      } ${
                        bg === 'default' ? 'bg-card' :
                        bg === 'sepia' ? 'bg-amber-50 dark:bg-amber-950' :
                        bg === 'dark' ? 'bg-zinc-900' :
                        'bg-stone-100 dark:bg-stone-900'
                      }`}
                    >
                      <span className="sr-only">{bg}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground text-center">
                  <span>Default</span>
                  <span>Sepia</span>
                  <span>Dark</span>
                  <span>Paper</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Animations</Label>
                  <p className="text-xs text-muted-foreground">Enable smooth transitions</p>
                </div>
                <Switch
                  checked={settings.animationsEnabled}
                  onCheckedChange={(v) => updateSetting('animationsEnabled', v)}
                />
              </div>

              <Separator />

              <h3 className="font-medium text-foreground flex items-center gap-2 pt-4">
                <Accessibility className="w-4 h-4 text-primary" />
                Accessibility
              </h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>High Contrast</Label>
                  <p className="text-xs text-muted-foreground">Increase text contrast</p>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(v) => updateSetting('highContrast', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reduced Motion</Label>
                  <p className="text-xs text-muted-foreground">Minimize animations</p>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(v) => updateSetting('reducedMotion', v)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
