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
  /**
   * Whether to render the internal title/reciter header block.
   * Keep this enabled for standalone layouts, disable when the page
   * already renders its own rich header around the text content.
   */
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
  /**
   * Layout style for couplets (2-line verses)
   * - 'vertical': Stack lines vertically (default)
   * - 'two-column': Split couplet into two columns (traditional Urdu style)
   */
  coupletLayout?: CoupletLayout;
  /**
   * Optional callback for building an in-page outline / table of contents.
   * Called once per header or major section with its index and text.
   */
  onSectionMeta?: (meta: { index: number; title: string; isHeader: boolean }) => void;
  onVerseRef?: (index: number, el: HTMLDivElement | null) => void;
}

/**
 * Intelligently parses text content without requiring manual markers
 * Auto-detects:
 * - Couplets (2-line verses) for two-column layout
 * - Natural breaks (empty lines, double newlines)
 * - Single-line verses
 * - Headers (lines that are shorter and appear at the start)
 */
function parseLayoutContent(textContent: string): LayoutSection[] {
  if (!textContent || !textContent.trim()) {
    return [];
  }

  const sections: LayoutSection[] = [];
  
  // First, check if there are any legacy markers (for backward compatibility)
  const hasLegacyMarkers = /\|\|BREAK|\|\|HEADER\|\|/.test(textContent);
  
  if (hasLegacyMarkers) {
    // Legacy mode: support old markers but simplify the logic
    const breakMarkerRegex = /\|\|BREAK(?::(\w+))?\|\||\|\|HEADER\|\|/g;
    const parts: Array<{ text: string; isMarker: boolean; style?: string }> = [];
    let lastIndex = 0;
    let match;
    
    while ((match = breakMarkerRegex.exec(textContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: textContent.substring(lastIndex, match.index), isMarker: false });
      }
      
      const marker = match[0];
      if (marker.startsWith('||BREAK')) {
        const style = match[1] || 'right';
        parts.push({ text: marker, isMarker: true, style });
      } else if (marker === '||HEADER||') {
        parts.push({ text: marker, isMarker: true });
      }
      
      lastIndex = breakMarkerRegex.lastIndex;
    }
    
    if (lastIndex < textContent.length) {
      parts.push({ text: textContent.substring(lastIndex), isMarker: false });
    }
    
    let currentSection: LayoutSection | null = null;
    let nextStyle: LayoutStyle = 'right';
    
    for (const part of parts) {
      if (part.isMarker) {
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        
        if (part.text.startsWith('||BREAK')) {
          nextStyle = (part.style as LayoutStyle) || 'right';
          sections.push({
            content: '',
            style: 'right',
            isBreak: true,
          });
        } else if (part.text === '||HEADER||') {
          nextStyle = 'header';
        }
      } else {
        const trimmed = part.text.trim();
        if (trimmed) {
          if (!currentSection) {
            currentSection = {
              content: trimmed,
              style: nextStyle,
              isHeader: nextStyle === 'header',
            };
          } else {
            currentSection.content += '\n' + trimmed;
          }
        }
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{
      content: textContent.trim(),
      style: 'right' as LayoutStyle,
    }];
  }
  
  // NEW: Intelligent auto-detection mode (no markers needed)
  // Split by double newlines or single newlines, preserving structure
  const lines = textContent.split('\n');
  const verses: string[] = [];
  let currentVerse: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    const isEmpty = !line;
    const nextIsEmpty = !nextLine;
    
    if (isEmpty) {
      // Empty line - if we have content, save it as a verse
      if (currentVerse.length > 0) {
        verses.push(currentVerse.join('\n'));
        currentVerse = [];
      }
      // Multiple empty lines create a break
      if (nextIsEmpty && currentVerse.length === 0) {
        // Skip consecutive empty lines
        continue;
      }
    } else {
      currentVerse.push(line);
      
      // If next line is empty, this verse is complete
      if (nextIsEmpty && currentVerse.length > 0) {
        verses.push(currentVerse.join('\n'));
        currentVerse = [];
      }
    }
  }
  
  // Add final verse if exists
  if (currentVerse.length > 0) {
    verses.push(currentVerse.join('\n'));
  }
  
  // If no verses found (single block of text), treat entire content as one verse
  if (verses.length === 0) {
    verses.push(textContent.trim());
  }
  
  // Convert verses to sections with intelligent styling
  verses.forEach((verse, index) => {
    const trimmed = verse.trim();
    if (!trimmed) return;
    
    const verseLines = trimmed.split('\n').filter(l => l.trim());
    const lineCount = verseLines.length;
    
    // Detect headers: very short lines (usually titles) at the start
    const isHeader = index === 0 && lineCount === 1 && trimmed.length < 50;
    
    // Auto-detect style based on content
    let style: LayoutStyle = 'right';
    if (isHeader) {
      style = 'header';
    }
    
    sections.push({
      content: trimmed,
      style,
      isHeader,
    });
  });
  
  return sections.length > 0 ? sections : [{
    content: textContent.trim(),
    style: 'right' as LayoutStyle,
  }];
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
  coupletLayout = 'two-column',
  onSectionMeta,
  onVerseRef,
}: RecitationLayoutProps) {
  const sections = parseLayoutContent(textContent);
  const sectionMetaRef = useRef<{ index: number; title: string; isHeader: boolean }[]>([]);
  // Reset collected section metadata on each render; it will be repopulated below.
  sectionMetaRef.current = [];
  
  const getAlignmentClass = (style: LayoutStyle) => {
    switch (style) {
      case 'center':
        return 'text-center';
      case 'indent':
        return 'text-center pr-8 md:pr-16'; // Indented from right (RTL)
      case 'left':
        return 'text-left';
      case 'header':
        return 'text-right';
      case 'right':
      default:
        return 'text-right';
    }
  };

  const getTextAlignment = (style: LayoutStyle) => {
    // For RTL languages, ensure proper alignment
    switch (style) {
      case 'center':
        return 'text-center';
      case 'left':
        return 'text-left';
      case 'right':
      case 'header':
      default:
        return 'text-right';
    }
  };
  
  const getSpacingClass = (isBreak: boolean, isHeader: boolean, hasNextBreak: boolean, isLast: boolean) => {
    if (isHeader) return compactMode ? 'mb-4' : 'mb-6';
    if (isBreak || hasNextBreak) return compactMode ? 'my-6' : 'my-10 md:my-12';
    // Natural spacing between verses - no manual breaks needed
    if (isLast) return compactMode ? 'mb-0' : 'mb-0';
    return compactMode ? 'mb-4 md:mb-6' : 'mb-6 md:mb-8';
  };
  
  let verseIndex = 0;

  useEffect(() => {
    if (!onSectionMeta) return;
    // After the layout has rendered, notify parent about discovered sections.
    sectionMetaRef.current.forEach(onSectionMeta);
  }, [textContent, onSectionMeta]);
  
  // Ensure fontSize is never too small (minimum 12px for readability)
  const safeFontSize = Math.max(fontSize || 18, 12);
  
  return (
    <div 
      data-recitation-layout
      className={`space-y-0 w-full select-none ${className}`}
      style={{ 
        fontSize: `${safeFontSize}px`,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
        // Many Nastaliq / Arabic fonts ignore pure letter-spacing, so we
        // also gently increase word-spacing to make the effect visible.
        letterSpacing: `${letterSpacing ?? 0}em`,
        wordSpacing: `${(letterSpacing ?? 0) * 2}em`,
        // Prevent browser zoom from affecting font size - use all vendor prefixes
        textSizeAdjust: '100%',
        WebkitTextSizeAdjust: '100%',
        MozTextSizeAdjust: '100%',
        msTextSizeAdjust: '100%',
        // Prevent text selection for better PWA experience
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        // Prevent touch callout on iOS
        WebkitTouchCallout: 'none',
      } as React.CSSProperties}
      dir="rtl"
    >
      {/* Optional internal header block.
          This is intended for standalone uses of RecitationLayout.
          On full pages that already show title/reciter meta, pass showHeader={false}. */}
      {showHeader && (title || reciter || poet) && sections.length > 0 && !sections[0]?.isHeader && (
        <div className="mb-8 pb-4 border-b border-border/70">
          {/* First Row: Poet (Left) + Title (Right) */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-left">
              {poet && (
                <div className="text-sm md:text-base text-red-600 dark:text-red-400 font-medium">
                  شاعر : {poet}
                </div>
              )}
            </div>
            <div className="text-right">
              {title && (
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                  {title}
                </h2>
              )}
            </div>
          </div>
          
          {/* Second Row: Reciter (Left) */}
          {reciter && (
            <div className="text-left">
              <div className="text-sm md:text-base text-red-600 dark:text-red-400 font-medium">
                منقبت خواں: {reciter}
              </div>
            </div>
          )}
        </div>
      )}
      
      {sections.map((section, sectionIndex) => {
        // Check if next section is a break
        const nextSection = sections[sectionIndex + 1];
        const hasNextBreak = nextSection?.isBreak || false;
        const prevSection = sections[sectionIndex - 1];
        const hasPrevBreak = prevSection?.isBreak || false;
        const isLast = sectionIndex === sections.length - 1;
        
        // Skip empty break markers - render as a subtle divider spacer
        if (section.isBreak && !section.content) {
          return (
            <div 
              key={`break-${sectionIndex}`}
              className={`${compactMode ? 'my-6' : 'my-10 md:my-12'}`}
            >
              <div className="h-px bg-border/70 dark:bg-border/80"></div>
            </div>
          );
        }
        
        // Skip empty sections
        if (!section.content.trim()) {
          return null;
        }
        
        const lines = section.content.split('\n').filter(l => l.trim());
        const currentVerseIndex = verseIndex;
        const isCurrentVerse = highlightCurrentVerse && currentVerse === currentVerseIndex;
        
        // Increment verse index for non-break, non-header sections
        if (!section.isBreak && !section.isHeader) {
          verseIndex++;
        }
        
        // Auto-detect couplets: verses with exactly 2 lines automatically get two-column layout
        // This makes it easy - just paste your text, and couplets are automatically formatted!
        const isCouplet = lines.length === 2 && !section.isHeader;

        // Collect headers and first lines of major sections for TOC/outline;
        // actual callback to parent is fired in an effect after render.
        if (!section.isBreak && lines[0]) {
          sectionMetaRef.current.push({
            index: currentVerseIndex,
            title: lines[0].trim(),
            isHeader: !!section.isHeader,
          });
        }
        
        return (
          <React.Fragment key={`section-${sectionIndex}`}>
            {/* Divider line before section if previous was a break */}
            {hasPrevBreak && !section.isHeader && (
              <div className={`${compactMode ? 'mb-6' : 'mb-8 md:mb-10'} h-px bg-border/70 dark:bg-border/80`}></div>
            )}
            
            <div
              ref={(el) => {
                if (onVerseRef && !section.isBreak && !section.isHeader) {
                  onVerseRef(currentVerseIndex, el);
                }
              }}
              data-verse-index={!section.isBreak && !section.isHeader ? currentVerseIndex : undefined}
              className={`
                ${getSpacingClass(section.isBreak || false, section.isHeader || false, hasNextBreak, isLast)}
                ${section.isHeader ? 'px-2 md:px-4' : compactMode ? 'py-3 px-4 md:px-6' : 'py-5 px-4 md:px-6 lg:px-8'}
                rounded-lg
                transition-colors duration-200
                ${
                  isCurrentVerse
                    ? 'bg-primary/10 ring-1 ring-primary/40'
                    : 'hover:bg-muted/40'
                }
                ${showVerseNumbers && !section.isHeader && !section.isBreak ? 'flex items-start gap-4' : ''}
              `}
            >
              {/* Text content - takes remaining space */}
              <div className={`
                ${showVerseNumbers && !section.isHeader && !section.isBreak ? 'flex-1' : 'w-full'}
                ${getAlignmentClass(section.style)}
              `}>
                {/* Two-column layout for couplets (traditional Urdu style) */}
                {isCouplet && coupletLayout === 'two-column' ? (
                  <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 lg:gap-x-8 gap-y-1 items-baseline">
                    {/* First line (right column in RTL) - aligns to right edge */}
                    <div className="text-right pr-2 md:pr-4 select-none">
                      <p 
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : 'font-normal'}
                          leading-relaxed
                          break-words
                          whitespace-normal
                          select-none
                        `}
                        dir="rtl"
                      >
                        {lines[0]?.trim()}
                      </p>
                    </div>
                    {/* Second line (left column in RTL) - aligns to right edge */}
                    <div className="text-right pr-2 md:pr-4 select-none">
                      <p 
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : 'font-normal'}
                          leading-relaxed
                          break-words
                          whitespace-normal
                          select-none
                        `}
                        dir="rtl"
                      >
                        {lines[1]?.trim()}
                      </p>
                    </div>
                  </div>
                ) : isCouplet ? (
                  // Vertical layout for couplets (stacked)
                  <div className="space-y-3 md:space-y-4 select-none">
                    {lines.map((line, lineIndex) => (
                      <p 
                        key={`line-${lineIndex}`}
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : 'font-normal'}
                          leading-relaxed
                          break-words
                          ${getTextAlignment(section.style)}
                          select-none
                        `}
                        dir="rtl"
                      >
                        {line.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  // Regular layout for other sections (single column, properly aligned)
                  <div className="space-y-2 md:space-y-3 select-none">
                    {lines.map((line, lineIndex) => (
                      <p 
                        key={`line-${lineIndex}`}
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : 'font-normal'}
                          leading-relaxed
                          break-words
                          ${getTextAlignment(section.style)}
                          select-none
                        `}
                        dir="rtl"
                      >
                        {line.trim()}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Verse number on the left side (RTL) - separate from text */}
              {showVerseNumbers && !section.isHeader && !section.isBreak && (
                <div className="flex-shrink-0 pt-1">
                  <span className="inline-flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted rounded-full w-7 h-7 border border-border/50">
                    {currentVerseIndex + 1}
                  </span>
                </div>
              )}
            </div>
            
            {/* Horizontal divider line after section if next is a break */}
            {hasNextBreak && !section.isHeader && (
              <div className={`${compactMode ? 'mt-6' : 'mt-8 md:mt-10'} h-px border-t border-l border-r border-black dark:border-white`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
