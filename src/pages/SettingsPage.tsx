import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Type, Eye, Palette, 
  Accessibility, RotateCcw, Download, Trash2, Bell, BellOff, Settings, Smartphone
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSettings } from '@/hooks/use-settings';
import { useFavorites } from '@/hooks/use-favorites';
import { useReadingProgress } from '@/hooks/use-reading-progress';
import { useNotifications } from '@/hooks/use-notifications';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { clearRecentlyViewed } = useFavorites();
  const { getAllProgress } = useReadingProgress();
  const { 
    isEnabled: notificationsEnabled, 
    permission, 
    isLoading: notificationsLoading,
    requestPermission,
    toggleNotifications 
  } = useNotifications();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  // Check if app can be installed
  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
      toast({
        title: "App installed!",
        description: "Thank you for installing Followers of 14",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) {
      toast({
        title: "Install not available",
        description: "Please use your browser's menu to install the app",
        variant: "destructive"
      });
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }

      deferredPromptRef.current = null;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      toast({
        title: "Install failed",
        description: "Please try using your browser's menu to install",
        variant: "destructive"
      });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleResetSettings = () => {
    resetSettings();
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults",
    });
  };

  const handleClearHistory = () => {
    clearRecentlyViewed();
    toast({
      title: "History cleared",
      description: "Your reading history has been cleared",
    });
  };

  const handleClearData = () => {
    localStorage.clear();
    toast({
      title: "Data cleared",
      description: "All local data has been cleared. Refreshing...",
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 flex-1 max-w-2xl">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Settings
          </h1>
          <Button variant="outline" size="sm" onClick={handleResetSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
        </div>

        <div className="space-y-8">
          {/* Typography Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Type className="w-5 h-5 text-primary" />
              Typography
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Font Size</Label>
                  <span className="text-sm text-muted-foreground">{settings.fontSize}px</span>
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
                  <Label>Line Height</Label>
                  <span className="text-sm text-muted-foreground">{settings.lineHeight.toFixed(1)}</span>
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
                    <SelectItem value="cairo">Cairo (Modern & Clean - Recommended)</SelectItem>
                    <SelectItem value="tajawal">Tajawal (Modern & Readable)</SelectItem>
                    <SelectItem value="noto-sans-arabic">Noto Sans Arabic (Clean & Modern)</SelectItem>
                    <SelectItem value="ibm-plex-sans-arabic">IBM Plex Sans Arabic (Professional)</SelectItem>
                    <SelectItem value="amiri">Amiri (Classic Arabic)</SelectItem>
                    <SelectItem value="noto-nastaliq">Noto Nastaliq Urdu (Traditional Nastaliq)</SelectItem>
                    <SelectItem value="lateef">Lateef (Elegant Urdu)</SelectItem>
                    <SelectItem value="scheherazade">Scheherazade New (Modern Arabic)</SelectItem>
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
                    <SelectItem value="right">Right (RTL Default)</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="justify">Justify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Display Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Eye className="w-5 h-5 text-primary" />
              Display
            </h2>
            
            <div className="space-y-4">
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
                  <Label>Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">Reduce spacing between verses</p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(v) => updateSetting('compactMode', v)}
                />
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Reader Background</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose a background theme that enhances your reading experience. Text colors will automatically adjust for optimal readability.
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {([
                    { value: 'default', label: 'Default', preview: 'bg-card' },
                    { value: 'sepia', label: 'Sepia', preview: 'bg-amber-50 dark:bg-amber-950' },
                    { value: 'paper', label: 'Paper', preview: 'bg-stone-100 dark:bg-stone-900' },
                    { value: 'parchment', label: 'Parchment', preview: 'bg-amber-100 dark:bg-amber-900/40' },
                    { value: 'cream', label: 'Cream', preview: 'bg-amber-50 dark:bg-amber-950/20' },
                    { value: 'warm-white', label: 'Warm White', preview: 'bg-orange-50 dark:bg-orange-950/20' },
                    { value: 'blue-light', label: 'Blue Light', preview: 'bg-blue-50 dark:bg-blue-950/30' },
                    { value: 'green-light', label: 'Green Light', preview: 'bg-emerald-50 dark:bg-emerald-950/30' },
                    { value: 'dark', label: 'Dark', preview: 'bg-zinc-900' },
                    { value: 'night', label: 'Night', preview: 'bg-slate-950' },
                  ] as const).map((bg) => (
                    <button
                      key={bg.value}
                      onClick={() => updateSetting('readerBackground', bg.value)}
                      className={`h-20 rounded-xl border-2 transition-all relative overflow-hidden group ${
                        settings.readerBackground === bg.value 
                          ? 'border-primary ring-2 ring-primary/20 scale-105' 
                          : 'border-border hover:border-primary/50 hover:scale-102'
                      } ${bg.preview}`}
                      title={bg.label}
                    >
                      {settings.readerBackground === bg.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-full px-1">
                        <span className={`text-[10px] font-medium ${
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
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              {notificationsEnabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              Notifications
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label>Event Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    {notificationsEnabled 
                      ? "You'll receive notifications about upcoming events on your device"
                      : "Get notified about upcoming Ahlul Bait events even when the app is closed"
                    }
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked && (permission.state === 'default' || permission.state === 'denied')) {
                      // If permission is default or denied, request it
                      const granted = await requestPermission();
                      if (!granted && permission.state === 'denied') {
                        toast({
                          title: "Notifications blocked",
                          description: "Please enable notifications in your browser settings first",
                          variant: "destructive"
                        });
                      }
                    } else {
                      await toggleNotifications();
                    }
                  }}
                  disabled={notificationsLoading}
                />
              </div>

              {!notificationsEnabled && (permission.state === 'default' || permission.state === 'denied') && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground font-medium mb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Enable Notifications
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {permission.state === 'denied' 
                        ? "Notifications are currently blocked. Please enable them in your browser settings, then toggle the switch above."
                        : "Click the switch above to enable gentle reminders for important events."
                      }
                    </p>
                    {permission.state === 'denied' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "How to enable notifications",
                            description: "1. Click the lock icon (🔒) in your browser's address bar\n2. Find 'Notifications' in permissions\n3. Change it to 'Allow'\n4. Refresh this page and toggle the switch",
                            duration: 8000,
                          });
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Show Instructions
                      </Button>
                    )}
                  </div>
                </>
              )}

              {notificationsEnabled && (
                <>
                  <Separator />
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary font-medium mb-1 flex items-center gap-2">
                      <span className="text-lg">✓</span>
                      Notifications Active
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You'll receive peaceful reminders about upcoming events. Notifications work even when the app is closed.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Install App Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Smartphone className="w-5 h-5 text-primary" />
              Install App
            </h2>
            
            <div className="space-y-4">
              {isInstalled ? (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary font-medium mb-1 flex items-center gap-2">
                    <span className="text-lg">✓</span>
                    App Installed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The app is installed on your device. You can access it from your home screen.
                  </p>
                </div>
              ) : canInstall ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      Install "Followers of 14" on your device for a better experience:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Quick access from your home screen</li>
                      <li>Works offline with cached content</li>
                      <li>Faster loading and smoother experience</li>
                      <li>No need to open browser every time</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="w-full sm:w-auto"
                  >
                    {isInstalling ? (
                      <>
                        <Download className="w-4 h-4 mr-2 animate-pulse" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Install App
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-foreground font-medium mb-2">
                    Install App
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    To install this app on your device:
                  </p>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <div>
                      <strong className="text-foreground">Chrome/Edge (Android):</strong>
                      <p>Tap the menu (⋮) → "Install app" or "Add to Home screen"</p>
                    </div>
                    <div>
                      <strong className="text-foreground">Safari (iOS):</strong>
                      <p>Tap the Share button (□↑) → "Add to Home Screen"</p>
                    </div>
                    <div>
                      <strong className="text-foreground">Chrome (Desktop):</strong>
                      <p>Click the install icon (⊕) in the address bar</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Accessibility Section */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Accessibility className="w-5 h-5 text-primary" />
              Accessibility
            </h2>
            
            <div className="space-y-4">
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
          </section>

          {/* Data Management */}
          <section className="bg-card rounded-2xl p-6 border border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-6">
              <Download className="w-5 h-5 text-primary" />
              Data Management
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reading Progress</Label>
                  <p className="text-xs text-muted-foreground">
                    {getAllProgress().length} pieces tracked
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearHistory}
                >
                  Clear History
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-destructive">Clear All Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove all settings, favorites, and history
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all your settings, favorites, and reading history. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearData}>
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Permission Request Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Enable Event Notifications</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2">
              Stay connected with important dates of Ahlul Bait (AS)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Never Miss an Event</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get timely reminders about upcoming birthdays, anniversaries, and important dates
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Works in Background</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receive notifications even when the website is closed - perfect for mobile devices
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Time Reminders</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    See exactly how much time is left until each event in your notifications
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> After enabling, you'll receive a test notification in 1-2 minutes to confirm everything is working. You can disable notifications anytime from settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPermissionDialog(false)}
            >
              Maybe Later
            </Button>
            <Button
              onClick={async () => {
                setShowPermissionDialog(false);
                const granted = await requestPermission();
                if (!granted) {
                  toast({
                    title: "Permission needed",
                    description: "Please allow notifications in your browser to receive event reminders",
                    variant: "destructive"
                  });
                }
              }}
              disabled={notificationsLoading}
            >
              {notificationsLoading ? "Enabling..." : "Enable Notifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
