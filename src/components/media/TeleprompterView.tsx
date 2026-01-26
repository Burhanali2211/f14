import { useState, useCallback, useEffect } from 'react';
import {
  Play, Edit2, X, Settings, Music,
  FileText, AlertCircle, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TeleprompterPlayer } from './TeleprompterPlayer';
import { TeleprompterEditor } from './TeleprompterEditor';
import type { TeleprompterSession, TeleprompterSegment } from '@/lib/teleprompter-types';
import {
  getSession,
  createSession,
  updateSessionSettings,
  parseTextToSegments,
} from '@/lib/teleprompter-storage';
import { toast } from '@/hooks/use-toast';

interface TeleprompterViewProps {
  pieceId: string;
  title: string;
  textContent?: string;
  audioUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TeleprompterView({
  pieceId,
  title,
  textContent = '',
  audioUrl,
  isOpen,
  onClose,
}: TeleprompterViewProps) {
  const [session, setSession] = useState<TeleprompterSession | null>(null);
  const [mode, setMode] = useState<'play' | 'edit' | 'settings'>('play');
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [settings, setSettings] = useState({
    fontSize: 24,
    highlightMode: 'background' as 'background' | 'border' | 'scale' | 'glow',
    scrollBehavior: 'smooth' as 'smooth' | 'instant' | 'auto',
  });

  useEffect(() => {
    if (!isOpen) return;

    let existingSession = getSession(pieceId);
    
    if (!existingSession) {
      const initialSegments = textContent ? parseTextToSegments(textContent) : [];
      existingSession = createSession(pieceId, audioUrl, initialSegments);
    }
    
    setSession(existingSession);
    setSettings({
      fontSize: existingSession.fontSize,
      highlightMode: existingSession.highlightMode,
      scrollBehavior: existingSession.scrollBehavior,
    });

    if (!existingSession.audioUrl && !audioUrl) {
      setMode('edit');
    }
  }, [isOpen, pieceId, textContent, audioUrl]);

  const handleSettingsChange = useCallback(<K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    if (session) {
      const updated = updateSessionSettings(session.id, { [key]: value });
      if (updated) {
        setSession(updated);
      }
    }
  }, [session]);

  const handleSetAudioUrl = useCallback(() => {
    if (!session || !customAudioUrl.trim()) return;

    const updated = updateSessionSettings(session.id, { audioUrl: customAudioUrl.trim() });
    if (updated) {
      setSession(updated);
      toast({
        title: 'Audio URL set',
        description: 'The audio file has been linked to this recitation.',
      });
    }
    setShowAudioUpload(false);
    setCustomAudioUrl('');
  }, [session, customAudioUrl]);

  const handleEditorSave = useCallback((updatedSession: TeleprompterSession) => {
    setSession(updatedSession);
    toast({
      title: 'Segments saved',
      description: 'Your teleprompter segments have been saved.',
    });
    setMode('play');
  }, []);

  const handleGenerateSegments = useCallback(() => {
    if (!textContent) {
      toast({
        title: 'No text content',
        description: 'This recitation has no text content to generate segments from.',
        variant: 'destructive',
      });
      return;
    }

    const segments = parseTextToSegments(textContent);
    
    if (session) {
      const updated = updateSessionSettings(session.id, {});
      if (updated) {
        updated.segments = segments;
        setSession(updated);
        toast({
          title: 'Segments generated',
          description: `Created ${segments.length} segments from the text content.`,
        });
        setMode('edit');
      }
    }
  }, [session, textContent]);

  if (!isOpen) return null;

  const hasSegments = session?.segments && session.segments.length > 0;
  const hasAudio = session?.audioUrl || audioUrl;
  const effectiveAudioUrl = session?.audioUrl || audioUrl;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border bg-background">
            <div className="flex items-center gap-4">
              <div>
                <h2 
                  className="text-lg font-semibold overflow-visible py-1"
                  dir="rtl"
                  style={{ 
                    fontFamily: "'Noto Nastaliq Urdu', 'Cairo', sans-serif",
                    lineHeight: '1.6'
                  }}
                >
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Teleprompter Mode
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <TabsList>
                  <TabsTrigger value="play" disabled={!hasSegments}>
                    <Play className="w-4 h-4 mr-1" />
                    Play
                  </TabsTrigger>
                  <TabsTrigger value="edit">
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="w-4 h-4 mr-1" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {mode === 'play' && (
              <>
                {hasSegments ? (
                  <TeleprompterPlayer
                    pieceId={pieceId}
                    audioUrl={effectiveAudioUrl}
                    segments={session?.segments || []}
                    fontSize={settings.fontSize}
                    highlightMode={settings.highlightMode}
                    scrollBehavior={settings.scrollBehavior}
                    className="h-full"
                    onClose={onClose}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Segments Created</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      Create segments to sync your lyrics with the audio. 
                      Each segment represents a verse or paragraph with timing.
                    </p>
                    <div className="flex gap-3">
                      {textContent && (
                        <Button onClick={handleGenerateSegments} variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Auto-generate from Text
                        </Button>
                      )}
                      <Button onClick={() => setMode('edit')}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Create Segments
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {mode === 'edit' && (
              <TeleprompterEditor
                pieceId={pieceId}
                textContent={textContent}
                audioUrl={effectiveAudioUrl}
                onSave={handleEditorSave}
                onClose={() => setMode('play')}
              />
            )}

            {mode === 'settings' && (
              <div className="p-6 max-w-2xl mx-auto space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-3 block">Font Size: {settings.fontSize}px</Label>
                      <Slider
                        value={[settings.fontSize]}
                        onValueChange={([v]) => handleSettingsChange('fontSize', v)}
                        min={16}
                        max={48}
                        step={2}
                      />
                    </div>

                    <div>
                      <Label className="mb-3 block">Highlight Style</Label>
                      <Select
                        value={settings.highlightMode}
                        onValueChange={(v) => handleSettingsChange('highlightMode', v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="background">Background Color</SelectItem>
                          <SelectItem value="border">Border Highlight</SelectItem>
                          <SelectItem value="scale">Scale Effect</SelectItem>
                          <SelectItem value="glow">Glow Effect</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-3 block">Scroll Behavior</Label>
                      <Select
                        value={settings.scrollBehavior}
                        onValueChange={(v) => handleSettingsChange('scrollBehavior', v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smooth">Smooth Scroll</SelectItem>
                          <SelectItem value="instant">Instant Jump</SelectItem>
                          <SelectItem value="auto">Auto (Browser Default)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Audio Source</h3>
                  
                  {effectiveAudioUrl ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <Music className="w-5 h-5 text-primary" />
                        <span className="font-medium">Audio Linked</span>
                      </div>
                      <p className="text-sm text-muted-foreground break-all">
                        {effectiveAudioUrl}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowAudioUpload(true)}
                      >
                        Change Audio
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-border rounded-lg text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground mb-3">No audio file linked</p>
                      <Button onClick={() => setShowAudioUpload(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Add Audio URL
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Play/Pause</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">Space</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Seek ±5s</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">← / →</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Prev/Next Segment</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">Shift + ← / →</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Volume</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">↑ / ↓</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Mute</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">M</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Loop Segment</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">L</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Fullscreen</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">F</kbd>
                    </div>
                    <div className="p-2 bg-muted rounded flex justify-between">
                      <span>Exit Fullscreen</span>
                      <kbd className="px-2 py-0.5 bg-background rounded text-xs">Esc</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog open={showAudioUpload} onOpenChange={setShowAudioUpload}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Audio URL</DialogTitle>
              <DialogDescription>
                Enter the URL to your audio file. This should be a direct link to an MP3, WAV, or other audio file.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Audio File URL</Label>
                <Input
                  value={customAudioUrl}
                  onChange={(e) => setCustomAudioUrl(e.target.value)}
                  placeholder="https://example.com/nasheed.mp3"
                  className="mt-1"
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                Tip: Upload your audio to cloud storage (Supabase, Google Drive, Dropbox) 
                and use the direct link here.
              </p>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAudioUpload(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetAudioUrl} disabled={!customAudioUrl.trim()}>
                Save Audio URL
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
