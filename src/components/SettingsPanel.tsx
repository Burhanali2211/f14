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
import { useIsMobile } from '@/hooks/use-mobile';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const isMobile = useIsMobile();

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'noto-nastaliq': return "'Noto Nastaliq Urdu', serif";
      case 'gulzar': return "'Gulzar', serif";
      case 'lateef': return "'Lateef', serif";
      case 'noto-sans-arabic': return "'Noto Sans Arabic', sans-serif";
      case 'reem-kufi': return "'Reem Kufi', sans-serif";
      case 'scheherazade': return "'Scheherazade New', serif";
      default: return "'Amiri', serif";
    }
  };

  // Quick presets for non-tech users
  const applyPreset = (preset: 'small' | 'medium' | 'large') => {
    switch (preset) {
      case 'small':
        updateSetting('fontSize', 18);
        updateSetting('lineHeight', 1.8);
        updateSetting('letterSpacing', 0.05);
        break;
      case 'medium':
        updateSetting('fontSize', 24);
        updateSetting('lineHeight', 2.2);
        updateSetting('letterSpacing', 0.1);
        break;
      case 'large':
        updateSetting('fontSize', 32);
        updateSetting('lineHeight', 2.5);
        updateSetting('letterSpacing', 0.15);
        break;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-0">
            <SheetTitle className="font-display text-xl">Settings</SheetTitle>
            <Button variant="ghost" size="sm" onClick={resetSettings} className="text-muted-foreground">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="reading" className="mt-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="reading" className={`text-xs sm:text-sm ${isMobile ? 'px-2' : ''}`}>
              {isMobile ? (
                <>
                  <Type className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Text</span>
                </>
              ) : (
                <>
                  <Type className="w-4 h-4 mr-1" />
                  <span>Text</span>
                </>
              )}
            </TabsTrigger>
            <TabsTrigger value="display" className={`text-xs sm:text-sm ${isMobile ? 'px-2' : ''}`}>
              {isMobile ? (
                <>
                  <Eye className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Display</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  <span>Display</span>
                </>
              )}
            </TabsTrigger>
            <TabsTrigger value="appearance" className={`text-xs sm:text-sm ${isMobile ? 'px-2' : ''}`}>
              {isMobile ? (
                <>
                  <Palette className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Theme</span>
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4 mr-1" />
                  <span>Theme</span>
                </>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Reading Settings */}
          <TabsContent value="reading" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                Typography
              </h3>
              
              {/* Text Preview Section - Shows how text will look */}
              <div className="p-4 rounded-lg border-2 border-primary/20 bg-card/80 backdrop-blur-sm shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Live Preview
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {settings.fontSize}px • {settings.lineHeight.toFixed(1)} • {settings.letterSpacing.toFixed(2)}em
                  </span>
                </div>
                <div
                  className="p-4 rounded-md bg-background border-2 border-border/60 min-h-[140px] sm:min-h-[160px] max-h-[240px] overflow-y-auto custom-scrollbar"
                  style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}em`,
                    wordSpacing: `${settings.letterSpacing * 2}em`,
                    fontFamily: getFontFamily(),
                    textAlign: settings.textAlign,
                    direction: 'rtl',
                  }}
                >
                  <div className="text-foreground whitespace-pre-wrap">
                    {settings.textAlign === 'center' ? (
                      <>
                        یا نبی سلام علیک<br />
                        یا رسول سلام علیک<br />
                        یا حبیب سلام علیک<br />
                        صلوات اللہ علیک<br />
                        <br />
                        اشرق البدر علینا<br />
                        فاختفت منہ البدور
                      </>
                    ) : settings.textAlign === 'justify' ? (
                      <>
                        لب پہ آتی ہے دعا بن کے تمنا میری<br />
                        زندگی شمع کی صورت ہو خدایا میری<br />
                        <br />
                        دور دنیا کا مرے دم سے اندھیرا ہو جائے<br />
                        ہر جگہ میرے چمکنے سے اجالا ہو جائے<br />
                        <br />
                        زندگی ہو مری پروانے کی صورت یا رب<br />
                        علم کی شمع سے ہو مجھ کو محبت یا رب
                      </>
                    ) : (
                      <>
                        یا نبی سلام علیک<br />
                        یا رسول سلام علیک<br />
                        یا حبیب سلام علیک<br />
                        صلوات اللہ علیک<br />
                        <br />
                        اشرق البدر علینا<br />
                        فاختفت منہ البدور<br />
                        مثل حسنک ما راینا<br />
                        قط یا وجہ السرور<br />
                        <br />
                        یا نبی سلام علیک<br />
                        یا رسول سلام علیک
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                  Preview updates in real-time as you adjust settings
                </p>
              </div>
              
              {/* Quick Presets - Easy for non-tech users */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Quick Text Size</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose a preset size for easier reading</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={settings.fontSize <= 20 ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset('small')}
                    className="h-12 text-sm"
                  >
                    Small
                  </Button>
                  <Button
                    variant={settings.fontSize > 20 && settings.fontSize <= 28 ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset('medium')}
                    className="h-12 text-sm"
                  >
                    Medium
                  </Button>
                  <Button
                    variant={settings.fontSize > 28 ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPreset('large')}
                    className="h-12 text-sm"
                  >
                    Large
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Text Size: {settings.fontSize}px</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Adjust the size of text</p>
                  </div>
                </div>
                <Slider
                  value={[settings.fontSize]}
                  min={16}
                  max={40}
                  step={2}
                  onValueChange={([v]) => updateSetting('fontSize', v)}
                  className="mt-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label>Space Between Words</Label>
                    <p className="text-xs text-muted-foreground">Make words closer or farther apart</p>
                  </div>
                </div>
                <Slider
                  value={[settings.letterSpacing]}
                  min={0}
                  max={0.4}
                  step={0.01}
                  onValueChange={([v]) => updateSetting('letterSpacing', v)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground text-right">
                  Current: {settings.letterSpacing.toFixed(2)}em
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <Label>Space Between Lines</Label>
                    <p className="text-xs text-muted-foreground">Adjust the gap between text lines</p>
                  </div>
                </div>
                <Slider
                  value={[settings.lineHeight]}
                  min={1.5}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) => updateSetting('lineHeight', v)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground text-right">
                  Current: {settings.lineHeight.toFixed(1)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Text Style</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose how the text looks</p>
                <Select
                  value={settings.fontFamily}
                  onValueChange={(v) => updateSetting('fontFamily', v as any)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cairo">Cairo - Modern & Clean (Recommended)</SelectItem>
                    <SelectItem value="tajawal">Tajawal - Modern & Readable</SelectItem>
                    <SelectItem value="noto-sans-arabic">Noto Sans Arabic - Clean & Modern</SelectItem>
                    <SelectItem value="ibm-plex-sans-arabic">IBM Plex - Professional</SelectItem>
                    <SelectItem value="amiri">Amiri - Classic Arabic</SelectItem>
                    <SelectItem value="noto-nastaliq">Noto Nastaliq - Traditional Urdu</SelectItem>
                    <SelectItem value="lateef">Lateef - Elegant Urdu</SelectItem>
                    <SelectItem value="scheherazade">Scheherazade - Modern Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Text Position</Label>
                <p className="text-xs text-muted-foreground mb-2">How text is aligned on the page</p>
                <Select
                  value={settings.textAlign}
                  onValueChange={(v) => updateSetting('textAlign', v as any)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right Side (Default)</SelectItem>
                    <SelectItem value="center">Centered</SelectItem>
                    <SelectItem value="justify">Justified (Even edges)</SelectItem>
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

              <div className="flex items-center justify-between py-2 min-h-[60px]">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base">Show Verse Numbers</Label>
                  <p className="text-xs text-muted-foreground mt-1">Show numbers before each verse</p>
                </div>
                <Switch
                  checked={settings.showVerseNumbers}
                  onCheckedChange={(v) => updateSetting('showVerseNumbers', v)}
                  className="flex-shrink-0"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2 min-h-[60px]">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base">Highlight Current Verse</Label>
                  <p className="text-xs text-muted-foreground mt-1">Highlight the verse you're reading</p>
                </div>
                <Switch
                  checked={settings.highlightCurrentVerse}
                  onCheckedChange={(v) => updateSetting('highlightCurrentVerse', v)}
                  className="flex-shrink-0"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2 min-h-[60px]">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base">Auto-Scroll with Audio</Label>
                  <p className="text-xs text-muted-foreground mt-1">Automatically scroll while audio plays</p>
                </div>
                <Switch
                  checked={settings.autoScrollWhilePlaying}
                  onCheckedChange={(v) => updateSetting('autoScrollWhilePlaying', v)}
                  className="flex-shrink-0"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2 min-h-[60px]">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base">Remember Reading Position</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Continue where you left off
                  </p>
                </div>
                <Switch
                  checked={settings.rememberReadingPosition}
                  onCheckedChange={(v) => updateSetting('rememberReadingPosition', v)}
                  className="flex-shrink-0"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between py-2 min-h-[60px]">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-base">Compact Mode</Label>
                  <p className="text-xs text-muted-foreground mt-1">Show more content with less spacing</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting('compactMode', v)}
                  className="flex-shrink-0"
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
