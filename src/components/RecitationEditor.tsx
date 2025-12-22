import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Eye, EyeOff, Type, ZoomIn, ZoomOut, 
  FileText, Languages, Scissors, Sparkles, Globe,
  RotateCcw, RotateCw, Copy, Check, Keyboard, HelpCircle
} from 'lucide-react';
import { RecitationLayout } from '@/components/RecitationLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/hooks/use-settings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RecitationEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  title?: string;
  reciter?: string;
  placeholder?: string;
  showPreview?: boolean;
  onTranslate?: () => void;
  onAiEnhance?: () => void;
  onFetchFromWebsite?: () => void;
  translating?: boolean;
  aiEnhancing?: boolean;
  fetchingContent?: boolean;
}

export function RecitationEditor({
  value,
  onChange,
  language,
  title,
  reciter,
  placeholder = "Enter your recitation text here...",
  showPreview = true,
  onTranslate,
  onAiEnhance,
  onFetchFromWebsite,
  translating = false,
  aiEnhancing = false,
  fetchingContent = false,
}: RecitationEditorProps) {
  const { settings } = useSettings();
  const [editorFontSize, setEditorFontSize] = useState(16);
  const [previewMode, setPreviewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPosRef = useRef<number | null>(null);

  // Monitor value prop changes to ensure textarea stays in sync
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || pendingCursorPosRef.current === null) return;
    
    // If values don't match, sync them
    if (textarea.value !== value) {
      textarea.value = value;
    }
    
    // Set cursor position if we have a pending one
    if (pendingCursorPosRef.current !== null) {
      textarea.setSelectionRange(pendingCursorPosRef.current, pendingCursorPosRef.current);
      textarea.focus();
      pendingCursorPosRef.current = null;
    }
  }, [value]);

  const isRTL = language === 'Kashmiri' || language === 'Urdu' || language === 'Arabic' || language === 'Persian';
  
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(w => w).length : 0;
  const lineCount = value.trim() ? value.split('\n').filter(l => l.trim()).length : 0;
  const characterCount = value.length;

  // Define getFontFamily function first
  const getFontFamily = useCallback(() => {
    switch (settings.fontFamily) {
      case 'noto-nastaliq': return "'Noto Nastaliq Urdu', serif";
      case 'gulzar': return "'Gulzar', serif";
      case 'lateef': return "'Lateef', serif";
      case 'noto-sans-arabic': return "'Noto Sans Arabic', sans-serif";
      case 'reem-kufi': return "'Reem Kufi', sans-serif";
      case 'scheherazade': return "'Scheherazade New', serif";
      default: return "'Amiri', serif";
    }
  }, [settings.fontFamily]);

  // Get font family value
  const fontFamilyValue = getFontFamily();

  // Memoize preview content to optimize rendering and ensure real-time updates
  const previewContent = useMemo(() => {
    if (!value.trim()) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <EyeOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Start typing to see live preview</p>
          </div>
        </div>
      );
    }
    
    return (
      <RecitationLayout
        key={`${value}-${settings.fontSize}-${settings.lineHeight}`} // Force re-render when key values change
        textContent={value}
        title={title}
        reciter={reciter}
        showHeader={false}
        fontSize={settings.fontSize}
        lineHeight={settings.lineHeight}
        letterSpacing={settings.letterSpacing}
        fontFamily={fontFamilyValue}
        compactMode={settings.compactMode}
        coupletLayout="two-column"
      />
    );
  }, [value, title, reciter, settings.fontSize, settings.lineHeight, settings.letterSpacing, settings.compactMode, fontFamilyValue]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all text?')) {
      onChange('');
      textareaRef.current?.focus();
    }
  };

  const adjustFontSize = (delta: number) => {
    setEditorFontSize(prev => Math.max(12, Math.min(24, prev + delta)));
  };

  // Insert text at cursor position using native textarea methods for better undo support
  const insertAtCursor = useCallback((textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Focus the textarea first
    textarea.focus();
    
    // Try using execCommand first (works in most modern browsers)
    try {
      const success = document.execCommand('insertText', false, textToInsert);
      if (success) {
        // Sync with React state immediately to update preview
        const newValue = textarea.value;
        onChange(newValue);
        return;
      }
    } catch (e) {
      // execCommand might not be supported, fall through to manual method
    }
    
    // Fallback to manual insertion
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = value.substring(0, start);
    const textAfter = value.substring(end);
    const newValue = textBefore + textToInsert + textAfter;
    
    // Update React state first to trigger preview update
    onChange(newValue);
    
    // Set value directly on textarea
    textarea.value = newValue;
    
    // Trigger input event to maintain some undo history
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    textarea.dispatchEvent(inputEvent);
    
    // Set cursor position after inserted text
    requestAnimationFrame(() => {
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }, [value, onChange]);

  // Insert line break (single newline)
  const insertLineBreak = useCallback(() => {
    insertAtCursor('\n');
    setLastAction('Line break inserted');
    setTimeout(() => setLastAction(''), 2000);
  }, [insertAtCursor]);

  // Insert paragraph break (double newline)
  const insertParagraphBreak = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.focus();
    
    // Get current cursor position and current textarea value
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    
    // Build new text with double newline (paragraph break)
    const paragraphBreak = '\n\n'; // Double newline for paragraph break
    const beforeText = currentValue.substring(0, start);
    const afterText = currentValue.substring(end);
    const newText = beforeText + paragraphBreak + afterText;
    
    // Update React state - this is the source of truth for controlled component
    onChange(newText);
    
    // Store cursor position for later use - will be set by useEffect when value prop updates
    const newCursorPos = start + paragraphBreak.length;
    pendingCursorPosRef.current = newCursorPos;
    
    setLastAction('Paragraph break inserted');
    setTimeout(() => setLastAction(''), 2000);
  }, [onChange, value]);

  // Undo function
  const handleUndo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    const success = document.execCommand('undo', false);
    if (success) {
      // Immediately update React state to trigger preview update
      const newValue = textarea.value;
      onChange(newValue);
      setLastAction('Undone');
      setTimeout(() => setLastAction(''), 2000);
    }
  }, [onChange]);

  // Redo function
  const handleRedo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.focus();
    const success = document.execCommand('redo', false);
    if (success) {
      // Immediately update React state to trigger preview update
      const newValue = textarea.value;
      onChange(newValue);
      setLastAction('Redone');
      setTimeout(() => setLastAction(''), 2000);
    }
  }, [onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter: Insert line break (next line)
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      insertLineBreak();
      return;
    }

    // Ctrl/Cmd + Enter: Insert paragraph break (next paragraph)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      insertParagraphBreak();
      return;
    }

    // Ctrl/Cmd + K: Show keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowShortcuts(true);
      return;
    }

    // Ctrl/Cmd + /: Show keyboard shortcuts (alternative)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      setShowShortcuts(true);
      return;
    }

    // Ctrl/Cmd + =: Increase font size
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      adjustFontSize(1);
      return;
    }

    // Ctrl/Cmd + -: Decrease font size
    if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      adjustFontSize(-1);
      return;
    }

    // Ctrl/Cmd + 0: Reset font size
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      setEditorFontSize(16);
      return;
    }

    // Ctrl/Cmd + C: Copy (only if text is selected)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && textareaRef.current?.selectionStart !== textareaRef.current?.selectionEnd) {
      // Let default behavior handle it
      return;
    }

    // Ctrl/Cmd + A: Select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      // Let default behavior handle it
      return;
    }

    // Ctrl/Cmd + Z: Undo - let browser handle natively, but also sync state immediately
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      // Let default behavior happen, then sync state immediately for preview update
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          onChange(textareaRef.current.value);
        }
      });
      return;
    }

    // Ctrl/Cmd + Y or Shift + Ctrl/Cmd + Z: Redo - let browser handle natively, but also sync state immediately
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
      // Let default behavior happen, then sync state immediately for preview update
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          onChange(textareaRef.current.value);
        }
      });
      return;
    }

    // Alt + L: Insert line break
    if (e.altKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      e.stopPropagation();
      insertLineBreak();
      return;
    }

    // Alt + P: Insert paragraph break
    if (e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      e.stopPropagation();
      insertParagraphBreak();
      return;
    }

    // Alt + T: Translate (if available)
    if (e.altKey && e.key === 't' && onTranslate && value.trim()) {
      e.preventDefault();
      onTranslate();
      return;
    }

    // Alt + A: AI Enhance (if available)
    if (e.altKey && e.key === 'a' && onAiEnhance && value.trim()) {
      e.preventDefault();
      onAiEnhance();
      return;
    }

    // Alt + F: Fetch from website (if available)
    if (e.altKey && e.key === 'f' && onFetchFromWebsite) {
      e.preventDefault();
      onFetchFromWebsite();
      return;
    }

    // Alt + 1: Editor only view
    if (e.altKey && e.key === '1' && showPreview) {
      e.preventDefault();
      setPreviewMode('editor');
      return;
    }

    // Alt + 2: Split view
    if (e.altKey && e.key === '2' && showPreview) {
      e.preventDefault();
      setPreviewMode('split');
      return;
    }

    // Alt + 3: Preview only view
    if (e.altKey && e.key === '3' && showPreview) {
      e.preventDefault();
      setPreviewMode('preview');
      return;
    }

    // Escape: Clear selection or close dialogs
    if (e.key === 'Escape') {
      textareaRef.current?.blur();
      return;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Font Size Controls */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => adjustFontSize(-1)}
              disabled={editorFontSize <= 12}
              title="Decrease font size"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium min-w-[2.5rem] text-center">
              {editorFontSize}px
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => adjustFontSize(1)}
              disabled={editorFontSize >= 24}
              title="Increase font size"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* View Mode Toggle */}
          {showPreview && (
            <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
              <Button
                type="button"
                variant={previewMode === 'editor' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setPreviewMode('editor')}
                title="Editor only"
              >
                <FileText className="w-4 h-4 mr-1" />
                Editor
              </Button>
              <Button
                type="button"
                variant={previewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setPreviewMode('split')}
                title="Split view"
              >
                <Eye className="w-4 h-4 mr-1" />
                Split
              </Button>
              <Button
                type="button"
                variant={previewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                className="h-8"
                onClick={() => setPreviewMode('preview')}
                title="Preview only"
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Undo/Redo Buttons */}
            <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleUndo}
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleRedo}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Redo</span>
              </Button>
            </div>

            {/* Keyboard Shortcuts Help */}
            <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  title="Keyboard shortcuts (Ctrl+K or Ctrl+/)"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Shortcuts</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Keyboard className="w-5 h-5" />
                    Keyboard Shortcuts
                  </DialogTitle>
                  <DialogDescription>
                    Use these shortcuts to format your text efficiently
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  {/* Line & Paragraph Breaks */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Line & Paragraph Formatting</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Insert Line Break</span>
                          <span className="text-xs text-muted-foreground">(Next line)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Shift</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Enter</kbd>
                          <span className="text-xs text-muted-foreground ml-2">or</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">L</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Insert Paragraph Break</span>
                          <span className="text-xs text-muted-foreground">(Next paragraph)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Enter</kbd>
                          <span className="text-xs text-muted-foreground ml-2">or</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">P</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div>
                          <span className="text-sm">Regular Enter</span>
                          <span className="text-xs text-muted-foreground block">(Default paragraph break)</span>
                        </div>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Enter</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Text Formatting */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Text Formatting</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Increase Font Size</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">+</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Decrease Font Size</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">-</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Reset Font Size</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">0</kbd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View Controls */}
                  {showPreview && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-foreground">View Controls</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">Editor Only</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + 1</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">Split View</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + 2</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">Preview Only</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + 3</kbd>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Actions</h3>
                    <div className="space-y-2">
                      {onTranslate && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">Translate</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + T</kbd>
                        </div>
                      )}
                      {onAiEnhance && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">AI Enhance</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + A</kbd>
                        </div>
                      )}
                      {onFetchFromWebsite && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <span className="text-sm">Fetch from Website</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Alt + F</kbd>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Show Shortcuts</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">K</kbd>
                          <span className="text-xs text-muted-foreground ml-2">or</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">/</kbd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Standard Shortcuts */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-foreground">Standard Shortcuts</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Select All</span>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl + A</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Copy</span>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl + C</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Paste</span>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl + V</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Undo</span>
                        <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl + Z</kbd>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <span className="text-sm">Redo</span>
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Y</kbd>
                          <span className="text-xs text-muted-foreground ml-2">or</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Shift</kbd>
                          <span className="text-xs text-muted-foreground">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-background border border-border rounded">Z</kbd>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">💡 Tip:</strong> On Mac, use <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Cmd</kbd> instead of <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Ctrl</kbd>
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {onFetchFromWebsite && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onFetchFromWebsite}
                disabled={fetchingContent}
                title="Fetch from website (Alt+F)"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fetch</span>
              </Button>
            )}
            {onAiEnhance && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onAiEnhance}
                disabled={aiEnhancing || !value.trim()}
                title="AI Enhance (Alt+A)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI</span>
              </Button>
            )}
            {onTranslate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={onTranslate}
                disabled={translating || !value.trim()}
                title="Translate (Alt+T)"
              >
                <Languages className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Translate</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleCopy}
              disabled={!value.trim()}
              title="Copy text"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleClear}
              disabled={!value.trim()}
              title="Clear all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
          <span>
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            {wordCount} words
          </span>
          <span>
            <Type className="w-3.5 h-3.5 inline mr-1" />
            {lineCount} lines
          </span>
          <span className="hidden sm:inline">
            {characterCount.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* Editor and Preview */}
      <div className={`
        grid gap-4
        ${previewMode === 'split' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
        }
      `}>
        {/* Editor */}
        {(previewMode === 'editor' || previewMode === 'split') && (
          <div className="space-y-2">
            <Label htmlFor="recitation-text" className="text-sm font-medium">
              Text Editor
            </Label>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                id="recitation-text"
                value={value}
                onChange={(e) => {
                  // Immediately update to trigger preview
                  onChange(e.target.value);
                }}
                onInput={(e) => {
                  // Also handle input events for programmatic changes
                  const target = e.target as HTMLTextAreaElement;
                  if (target.value !== value) {
                    onChange(target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`
                  min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px]
                  font-arabic
                  resize-y
                  ${isRTL ? 'text-right' : 'text-left'}
                  focus:ring-2 focus:ring-primary/20
                  transition-all
                  text-base sm:text-lg
                `}
                style={{
                  fontSize: `${editorFontSize}px`,
                  lineHeight: '1.8',
                  fontFamily: fontFamilyValue,
                  direction: isRTL ? 'rtl' : 'ltr',
                }}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
              {lastAction && (
                <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md shadow-lg animate-in fade-in slide-in-from-bottom-2">
                  {lastAction}
                </div>
              )}
              {!value.trim() && (
                <div className="absolute top-4 left-4 right-4 pointer-events-none">
                  <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-4 border border-dashed border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">💡 Tips for better formatting:</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Each line will be treated as a separate line in the recitation</li>
                      <li>Empty lines create natural breaks between verses</li>
                      <li>Two-line verses (couplets) automatically get two-column layout</li>
                      <li>Just paste your text - no special formatting needed!</li>
                      <li className="mt-2 pt-2 border-t border-border/50">
                        <strong className="text-foreground">⌨️ Keyboard Shortcuts:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Ctrl+K</kbd> or <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Ctrl+/</kbd> to see all shortcuts
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && (previewMode === 'preview' || previewMode === 'split') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Live Preview
            </Label>
            <div className={`
              min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px]
              p-3 sm:p-4 md:p-6 lg:p-8
              bg-card border border-border rounded-lg
              overflow-y-auto
              ${previewMode === 'split' ? 'max-h-[400px] sm:max-h-[500px] md:max-h-[600px] lg:max-h-[700px]' : ''}
            `}>
              {previewContent}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3 border border-primary/20">
        <p className="text-xs font-medium text-foreground mb-1.5">
          ✨ Automatic Formatting
        </p>
        <p className="text-xs text-muted-foreground">
          The system automatically detects couplets (2-line verses) and formats them in a beautiful two-column layout. 
          Just paste your text with proper line breaks - no manual formatting needed!
        </p>
      </div>
    </div>
  );
}

