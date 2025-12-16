import { X, RotateCcw, Type, Eye, Palette, Accessibility } from 'lucide-react';
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="reading" className="text-xs">
              <Type className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="display" className="text-xs">
              <Eye className="w-4 h-4" />
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
                  <div className="flex flex-col gap-0.5">
                    <Label>Letter / Word Spacing</Label>
                    <span className="text-xs text-muted-foreground">
                      Current: {settings.letterSpacing.toFixed(2)}em
                    </span>
                  </div>
                </div>
                <Slider
                  value={[settings.letterSpacing]}
                  min={0}
                  max={0.4}
                  step={0.01}
                  onValueChange={([v]) => updateSetting('letterSpacing', v)}
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
                  <p className="text-xs text-muted-foreground">Highlight current verse while reading</p>
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
                  <Label>Remember Reading Position</Label>
                  <p className="text-xs text-muted-foreground">
                    Continue where you left off on this piece
                  </p>
                </div>
                <Switch
                  checked={settings.rememberReadingPosition}
                  onCheckedChange={(v) => updateSetting('rememberReadingPosition', v)}
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

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Appearance
              </h3>

              <div className="space-y-2">
                <Label>Reader Background</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose a background theme for optimal reading
                </p>
                <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                  {([
                    { value: 'default', label: 'Default', preview: 'bg-card' },
                    { value: 'sepia', label: 'Sepia', preview: 'bg-amber-50 dark:bg-amber-950' },
                    { value: 'paper', label: 'Paper', preview: 'bg-stone-100 dark:bg-stone-900' },
                    { value: 'parchment', label: 'Parchment', preview: 'bg-amber-100 dark:bg-amber-900/40' },
                    { value: 'cream', label: 'Cream', preview: 'bg-amber-50 dark:bg-amber-950/20' },
                    { value: 'warm-white', label: 'Warm', preview: 'bg-orange-50 dark:bg-orange-950/20' },
                    { value: 'blue-light', label: 'Blue', preview: 'bg-blue-50 dark:bg-blue-950/30' },
                    { value: 'green-light', label: 'Green', preview: 'bg-emerald-50 dark:bg-emerald-950/30' },
                    { value: 'dark', label: 'Dark', preview: 'bg-zinc-900' },
                    { value: 'night', label: 'Night', preview: 'bg-slate-950' },
                  ] as const).map((bg) => (
                    <button
                      key={bg.value}
                      onClick={() => updateSetting('readerBackground', bg.value)}
                      className={`h-14 rounded-lg border-2 transition-all relative overflow-hidden group ${
                        settings.readerBackground === bg.value 
                          ? 'border-primary ring-2 ring-primary/20 scale-105' 
                          : 'border-border hover:border-primary/50 hover:scale-102'
                      } ${bg.preview}`}
                      title={bg.label}
                    >
                      {settings.readerBackground === bg.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-full px-0.5">
                        <span className={`text-[9px] font-medium leading-tight ${
                          bg.value === 'dark' || bg.value === 'night' 
                            ? 'text-white' 
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {bg.label}
                        </span>
                      </div>
                    </button>
                  ))}
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
