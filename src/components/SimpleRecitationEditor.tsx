import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, Loader2, Save, X, Plus, Trash2, 
  Settings2, Music, User, BookOpen, Calendar, 
  Type, Languages, Layout, Sparkles, Check, 
  CircleHelp, Search, Minus, Eye, EyeOff,
  SeparatorHorizontal, Copy, RotateCcw,
  ChevronUp, ChevronDown, Globe, Pilcrow
} from 'lucide-react';
import { useSettings } from '@/hooks/use-settings';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UILanguage } from '@/lib/ui-translations';
import { cn } from '@/lib/utils';

interface SimpleRecitationEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  title?: string;
  reciter?: string;
  placeholder?: string;
  onTranslate?: () => void;
  onAiEnhance?: () => void;
  onFetchFromWebsite?: () => void;
  translating?: boolean;
  aiEnhancing?: boolean;
  fetchingContent?: boolean;
  uiLanguage?: UILanguage;
}

const editorStrings = {
  ur: {
    smaller: 'چھوٹا',
    larger: 'بڑا',
    editor: 'ایڈیٹر',
    preview: 'پیش نظارہ',
    showEditor: 'ایڈیٹر دکھائیں',
    showPreview: 'پیش نظارہ دکھائیں',
    startTyping: 'یہاں لکھنا شروع کریں',
    typeSomething: 'پہلے کچھ لکھیں',
    words: 'الفاظ',
    lines: 'سطریں',
    paragraphs: 'پیراگراف',
    clearAll: 'تمام متن صاف کریں؟',
    advancedTools: 'اضافی خصوصیات',
    fetchFromWeb: 'ویب سے لائیں',
    translate: 'ترجمہ کریں',
    aiEnhance: 'AI بہتری',
    hint: 'ہر سطر ایک الگ لائن بنے گی',
    hintDesc: 'نیا پیراگراف بنانے کے لیے "وقفہ ڈالیں" بٹن دبائیں',
    placeholder: 'یہاں اپنا متن لکھیں...',
    addBreak: 'وقفہ ڈالیں',
    addBreakDesc: 'نیا پیراگراف شروع کریں',
    rtl: 'دائیں سے بائیں (اردو)',
    ltr: 'بائیں سے دائیں (English)',
    paragraph: 'پیراگراف',
  },
  en: {
    smaller: 'Smaller',
    larger: 'Larger',
    editor: 'Editor',
    preview: 'Preview',
    showEditor: 'Show Editor',
    showPreview: 'Show Preview',
    startTyping: 'Start typing here',
    typeSomething: 'Type something first',
    words: 'words',
    lines: 'lines',
    paragraphs: 'paragraphs',
    clearAll: 'Clear all text?',
    advancedTools: 'Advanced Tools',
    fetchFromWeb: 'Fetch from web',
    translate: 'Translate',
    aiEnhance: 'AI Enhance',
    hint: 'Each line becomes a separate line',
    hintDesc: 'Click "Add Break" button to start a new paragraph',
    placeholder: 'Type your text here...',
    addBreak: 'Add Break',
    addBreakDesc: 'Start a new paragraph',
    rtl: 'Right to Left (Urdu)',
    ltr: 'Left to Right (English)',
    paragraph: 'Paragraph',
  },
};

function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const lines = text.split('\n').filter(l => l.trim());
  let rtlCount = 0;
  let ltrCount = 0;
  
  for (const line of lines.slice(0, 10)) {
    if (rtlChars.test(line)) {
      rtlCount++;
    } else if (/[a-zA-Z]/.test(line)) {
      ltrCount++;
    }
  }
  
  return rtlCount >= ltrCount ? 'rtl' : 'ltr';
}

export function SimpleRecitationEditor({
  value,
  onChange,
  language,
  placeholder,
  onTranslate,
  onAiEnhance,
  onFetchFromWebsite,
  translating = false,
  aiEnhancing = false,
  fetchingContent = false,
  uiLanguage = 'ur',
}: SimpleRecitationEditorProps) {
  const { settings } = useSettings();
  const [fontSize, setFontSize] = useState(18);
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textDirection, setTextDirection] = useState<'rtl' | 'ltr'>(() => {
    const rtlLangs = ['Kashmiri', 'Urdu', 'Arabic', 'Persian'];
    return rtlLangs.includes(language) ? 'rtl' : 'ltr';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (value.trim()) {
      const detected = detectTextDirection(value);
      setTextDirection(detected);
    }
  }, [value]);

  const str = editorStrings[uiLanguage];
  const isRTL = textDirection === 'rtl';
  
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(w => w).length : 0;
  const lineCount = value.trim() ? value.split('\n').filter(l => l.trim()).length : 0;
  const paragraphCount = value.trim() ? value.split('|').filter(p => p.trim()).length : 0;

  const getFontFamily = () => {
    if (!isRTL) {
      return "'Inter', 'Segoe UI', sans-serif";
    }
    switch (settings.fontFamily) {
      case 'cairo': return "'Cairo', sans-serif";
      case 'tajawal': return "'Tajawal', sans-serif";
      case 'noto-sans-arabic': return "'Noto Sans Arabic', sans-serif";
      case 'noto-nastaliq': return "'Noto Nastaliq Urdu', serif";
      case 'scheherazade': return "'Scheherazade New', serif";
      default: return "'Cairo', sans-serif";
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    if (value.trim() && confirm(str.clearAll)) {
      onChange('');
      textareaRef.current?.focus();
    }
  };

  const insertParagraphBreak = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Store current scroll position to prevent auto-scrolling
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    
    const newValue = before + '|' + after;
    onChange(newValue);
    
    // Use requestAnimationFrame to ensure DOM is updated before restoring scroll
    requestAnimationFrame(() => {
      if (!textarea) return;
      
      // Restore scroll position first to prevent auto-scroll
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
      
      // Focus and set selection without triggering scroll
      textarea.focus();
      const newPos = start + 1;
      textarea.setSelectionRange(newPos, newPos);
      
      // Restore scroll position again after selection (in case browser scrolled)
      requestAnimationFrame(() => {
        if (!textarea) return;
        textarea.scrollTop = scrollTop;
        textarea.scrollLeft = scrollLeft;
      });
    });
  };

  const toggleTextDirection = () => {
    setTextDirection(prev => prev === 'rtl' ? 'ltr' : 'rtl');
  };

  const parseParagraphs = (text: string) => {
    return text.split('|').filter(p => p.trim()).map(p => ({
      lines: p.split('\n').filter(l => l.trim())
    }));
  };

  const paragraphs = parseParagraphs(value);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                  disabled={fontSize <= 14}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{str.smaller}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-sm font-medium min-w-[2.5rem] text-center">
            {fontSize}
          </span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setFontSize(prev => Math.min(28, prev + 2))}
                  disabled={fontSize >= 28}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{str.larger}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 px-3 rounded-full gap-1.5 text-xs",
                    isRTL ? "bg-primary/10 border-primary" : ""
                  )}
                  onClick={toggleTextDirection}
                >
                  <span className="font-medium">{isRTL ? 'ا' : 'A'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{isRTL ? 'A' : 'ا'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRTL ? str.rtl : str.ltr}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={showPreview ? "default" : "outline"}
                  size="sm"
                  className="h-9 gap-2 rounded-full px-4"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="hidden sm:inline">{showPreview ? str.editor : str.preview}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showPreview ? str.showEditor : str.showPreview}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {!showPreview && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertParagraphBreak();
                  }}
                >
                  <SeparatorHorizontal className="w-4 h-4" />
                  <span>{str.addBreak}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{str.addBreakDesc}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs text-muted-foreground">
            {uiLanguage === 'ur' ? 'نیا پیراگراف شروع کرنے کے لیے کلک کریں' : 'Click to start new paragraph'}
          </span>
        </div>
      )}

      {!showPreview ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || str.placeholder}
            className={cn(
              "min-h-[280px] sm:min-h-[350px]",
              "resize-y rounded-2xl border-2 focus:border-primary transition-all p-4",
              isRTL ? "text-right" : "text-left"
            )}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '2',
              fontFamily: getFontFamily(),
              direction: isRTL ? 'rtl' : 'ltr',
            }}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          
          {!value.trim() && (
            <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
              <div className="text-center space-y-3 max-w-xs">
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Type className="w-7 h-7 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {str.startTyping}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={cn(
            "min-h-[280px] sm:min-h-[350px]",
            "p-4 sm:p-6 bg-card border-2 border-border rounded-2xl overflow-y-auto"
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {value.trim() ? (
            <div className="space-y-6">
              {paragraphs.map((para, paraIndex) => (
                <div 
                  key={paraIndex}
                  className={cn(
                    "relative",
                    paraIndex > 0 && "pt-6 border-t border-dashed border-border"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full",
                    isRTL ? "right-0" : "left-0",
                    paraIndex > 0 ? "-translate-y-1/2" : "-translate-y-full -mt-1"
                  )}>
                    {str.paragraph} {paraIndex + 1}
                  </div>
                  
                  <div className="space-y-1 pt-2">
                    {para.lines.map((line, lineIndex) => (
                      <p 
                        key={lineIndex}
                        className={cn(
                          "leading-relaxed",
                          isRTL ? "text-right" : "text-left"
                        )}
                        style={{
                          fontSize: `${fontSize}px`,
                          lineHeight: settings.lineHeight || 1.8,
                          fontFamily: getFontFamily(),
                        }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <EyeOff className="w-12 h-12 mx-auto opacity-50" />
                <p className="text-sm">{str.typeSomething}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-3">
          <span>{wordCount} {str.words}</span>
          <span className="text-border">|</span>
          <span>{lineCount} {str.lines}</span>
          <span className="text-border">|</span>
          <span>{paragraphCount} {str.paragraphs}</span>
        </div>
        <div className="flex items-center gap-1">
          {value.trim() && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {(onTranslate || onAiEnhance || onFetchFromWebsite) && (
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-9 gap-2 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-4 h-4" />
              <span>{str.advancedTools}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-muted/30 rounded-xl border">
              {onFetchFromWebsite && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 rounded-xl"
                  onClick={onFetchFromWebsite}
                  disabled={fetchingContent}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-medium">{str.fetchFromWeb}</span>
                </Button>
              )}
              {onTranslate && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 rounded-xl"
                  onClick={onTranslate}
                  disabled={translating || !value.trim()}
                >
                  <Languages className="w-5 h-5" />
                  <span className="text-xs font-medium">{str.translate}</span>
                </Button>
              )}
              {onAiEnhance && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 rounded-xl"
                  onClick={onAiEnhance}
                  disabled={aiEnhancing || !value.trim()}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-medium">{str.aiEnhance}</span>
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3 border border-primary/20">
        <div className="flex items-start gap-2">
          <CircleHelp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1.5">
            <p className="font-medium text-foreground">{str.hint}</p>
            <p className="text-muted-foreground">{str.hintDesc}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background rounded-md border text-[10px]">
                <Pilcrow className="w-3 h-3" />
                {uiLanguage === 'ur' ? '"وقفہ ڈالیں" = نیا پیراگراف' : '"Add Break" = new paragraph'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
