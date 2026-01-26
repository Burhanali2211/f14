import React, { useEffect, useRef } from 'react';

export type LayoutStyle = 'right' | 'center' | 'indent' | 'left' | 'header';
export type CoupletLayout = 'vertical' | 'two-column';

export interface LayoutSection {
  content: string;
  style: LayoutStyle;
  isBreak?: boolean;
  isHeader?: boolean;
}

interface RecitationLayoutProps {
  textContent: string;
  title?: string;
  reciter?: string | null;
  poet?: string | null;
  showHeader?: boolean;
  className?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  compactMode?: boolean;
  highlightCurrentVerse?: boolean;
  currentVerse?: number;
  showVerseNumbers?: boolean;
  coupletLayout?: CoupletLayout;
  textDirection?: 'rtl' | 'ltr' | 'auto';
  onSectionMeta?: (meta: { index: number; title: string; isHeader: boolean }) => void;
  onVerseRef?: (index: number, el: HTMLDivElement | null) => void;
}

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

function parseParagraphs(textContent: string) {
  if (!textContent || !textContent.trim()) {
    return [];
  }
  
  return textContent.split('|').filter(p => p.trim()).map(p => ({
    lines: p.split('\n').filter(l => l.trim())
  }));
}

export function RecitationLayout({
  textContent,
  title,
  reciter,
  poet,
  showHeader = true,
  className = '',
  fontSize = 18,
  lineHeight = 1.8,
  letterSpacing = 0,
  fontFamily,
  compactMode = false,
  highlightCurrentVerse = false,
  currentVerse,
  showVerseNumbers = false,
  textDirection = 'auto',
  onSectionMeta,
  onVerseRef,
}: RecitationLayoutProps) {
  const paragraphs = parseParagraphs(textContent);
  const sectionMetaRef = useRef<{ index: number; title: string; isHeader: boolean }[]>([]);
  sectionMetaRef.current = [];
  
  const effectiveDirection = textDirection === 'auto' 
    ? detectTextDirection(textContent) 
    : textDirection;
  
  const isRTL = effectiveDirection === 'rtl';
  
  useEffect(() => {
    if (!onSectionMeta) return;
    sectionMetaRef.current.forEach(onSectionMeta);
  }, [textContent, onSectionMeta]);
  
  const safeFontSize = Math.max(fontSize || 18, 12);
  
  return (
    <div 
      data-recitation-layout
      className={`w-full select-none ${className}`}
      style={{ 
        fontSize: `${safeFontSize}px`,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
        letterSpacing: `${letterSpacing ?? 0}em`,
        wordSpacing: `${(letterSpacing ?? 0) * 2}em`,
        textSizeAdjust: '100%',
        WebkitTextSizeAdjust: '100%',
        MozTextSizeAdjust: '100%',
        msTextSizeAdjust: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as React.CSSProperties}
      dir={effectiveDirection}
    >
      {showHeader && (title || reciter || poet) && (
        <div className="mb-8 pb-4 border-b border-border/70">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className={isRTL ? "text-left" : "text-right"}>
              {poet && (
                <div className="text-sm md:text-base text-red-600 dark:text-red-400 font-medium">
                  {isRTL ? 'شاعر : ' : 'Poet: '}{poet}
                </div>
              )}
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              {title && (
                <h2 
                  className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-[2.2] py-1"
                  style={{ paddingTop: '0.3em', paddingBottom: '0.3em' }}
                >
                  {title}
                </h2>
              )}
            </div>
          </div>
          
          {reciter && (
            <div className={isRTL ? "text-left" : "text-right"}>
              <div className="text-sm md:text-base text-red-600 dark:text-red-400 font-medium">
                {isRTL ? 'منقبت خواں: ' : 'Reciter: '}{reciter}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={compactMode ? "space-y-4" : "space-y-6"}>
        {paragraphs.map((para, paraIndex) => {
          const isCurrentVerse = highlightCurrentVerse && currentVerse === paraIndex;
          
          if (para.lines[0]) {
            sectionMetaRef.current.push({
              index: paraIndex,
              title: para.lines[0].trim(),
              isHeader: false,
            });
          }
          
          return (
            <div
              key={paraIndex}
              ref={(el) => {
                if (onVerseRef) {
                  onVerseRef(paraIndex, el);
                }
              }}
              data-verse-index={paraIndex}
              className={`
                relative
                ${paraIndex > 0 ? (compactMode ? 'pt-4' : 'pt-6') : ''}
                ${paraIndex > 0 ? 'border-t border-dashed border-border/50' : ''}
                ${compactMode ? 'py-2 px-3' : 'py-3 px-4'}
                rounded-lg
                transition-colors duration-200
                ${isCurrentVerse ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/30'}
              `}
            >
              {showVerseNumbers && (
                <div className={`absolute ${compactMode ? 'top-2' : 'top-3'} ${isRTL ? 'left-2' : 'right-2'}`}>
                  <span className="inline-flex items-center justify-center text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 border border-primary/30">
                    {paraIndex + 1}
                  </span>
                </div>
              )}
              
              <div className="space-y-1">
                {para.lines.map((line, lineIndex) => (
                  <p 
                    key={lineIndex}
                    className={`leading-relaxed break-words ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={effectiveDirection}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
