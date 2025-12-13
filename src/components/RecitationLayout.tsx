import React from 'react';

export type LayoutStyle = 'right' | 'center' | 'indent' | 'left' | 'header';

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
  className?: string;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  compactMode?: boolean;
  highlightCurrentVerse?: boolean;
  currentVerse?: number;
  showVerseNumbers?: boolean;
  onVerseRef?: (index: number, el: HTMLDivElement | null) => void;
}

/**
 * Parses text content with layout markers and break points
 * Format:
 * - ||BREAK|| or ||BREAK:style|| for break points with optional style (right|left|center|indent)
 * - ||HEADER|| for header sections
 * - Regular text is right-aligned by default
 */
function parseLayoutContent(textContent: string): LayoutSection[] {
  const sections: LayoutSection[] = [];
  
  // Split by break markers - improved regex to capture style
  const breakMarkerRegex = /\|\|BREAK(?::(\w+))?\|\||\|\|HEADER\|\|/g;
  const parts: Array<{ text: string; isMarker: boolean; style?: string }> = [];
  let lastIndex = 0;
  let match;
  
  // Find all markers and split text
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
  
  // Add remaining text
  if (lastIndex < textContent.length) {
    parts.push({ text: textContent.substring(lastIndex), isMarker: false });
  }
  
  // If no markers found, split by double newlines
  if (parts.length === 1 && !parts[0].isMarker) {
    const verses = textContent.split(/\n\n+/).filter(v => v.trim());
    return verses.map(verse => ({
      content: verse.trim(),
      style: 'right' as LayoutStyle,
    }));
  }
  
  let currentSection: LayoutSection | null = null;
  let nextStyle: LayoutStyle = 'right';
  
  for (const part of parts) {
    if (part.isMarker) {
      // Close current section if exists
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
      
      if (part.text.startsWith('||BREAK')) {
        // Set style for next section (content after this break)
        nextStyle = (part.style as LayoutStyle) || 'right';
        // Add break marker for spacing (style doesn't matter for empty breaks)
        sections.push({
          content: '',
          style: 'right', // Break markers themselves don't need style
          isBreak: true,
        });
      } else if (part.text === '||HEADER||') {
        nextStyle = 'header';
      }
    } else {
      // Regular content
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
  
  // Add final section if exists
  if (currentSection) {
    sections.push(currentSection);
  }
  
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
  className = '',
  fontSize = 18,
  lineHeight = 1.8,
  fontFamily,
  compactMode = false,
  highlightCurrentVerse = false,
  currentVerse,
  showVerseNumbers = false,
  onVerseRef,
}: RecitationLayoutProps) {
  const sections = parseLayoutContent(textContent);
  
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
  
  const getSpacingClass = (isBreak: boolean, isHeader: boolean, hasNextBreak: boolean) => {
    if (isHeader) return compactMode ? 'mb-4' : 'mb-6';
    if (isBreak || hasNextBreak) return compactMode ? 'my-6' : 'my-10 md:my-12';
    return compactMode ? 'mb-3' : 'mb-6';
  };
  
  let verseIndex = 0;
  
  return (
    <div 
      className={`space-y-0 ${className}`}
      style={{ 
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
      }}
      dir="rtl"
    >
      {/* Header Section - Grid Layout (Left-Right) */}
      {(title || reciter || poet) && sections.length > 0 && !sections[0]?.isHeader && (
        <div className="mb-10 pb-6 border-b-2 border-black dark:border-white">
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
        
        // Skip empty break markers - render as single bold divider line
        if (section.isBreak && !section.content) {
          return (
            <div 
              key={`break-${sectionIndex}`}
              className={`${compactMode ? 'my-6' : 'my-10 md:my-12'}`}
            >
              <div className="h-px border-t border-l border-r border-black dark:border-white"></div>
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
        
        // Determine if this is a couplet (2 lines) for grid layout
        const isCouplet = lines.length === 2;
        
        return (
          <React.Fragment key={`section-${sectionIndex}`}>
            {/* Horizontal divider line before section if previous was a break */}
            {hasPrevBreak && !section.isHeader && (
              <div className={`${compactMode ? 'mb-6' : 'mb-8 md:mb-10'} h-px border-t border-l border-r border-black dark:border-white`}></div>
            )}
            
            <div
              ref={(el) => {
                if (onVerseRef && !section.isBreak && !section.isHeader) {
                  onVerseRef(currentVerseIndex, el);
                }
              }}
              className={`
                ${getSpacingClass(section.isBreak || false, section.isHeader || false, hasNextBreak)}
                ${section.isHeader ? 'px-4' : 'py-5 px-4 md:px-6 lg:px-8'}
                rounded-xl
                transition-all duration-300
                ${
                  isCurrentVerse
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-muted/50'
                }
                ${showVerseNumbers && !section.isHeader && !section.isBreak ? 'flex items-start gap-4' : ''}
              `}
            >
              {/* Text content - takes remaining space */}
              <div className={`
                ${showVerseNumbers && !section.isHeader && !section.isBreak ? 'flex-1' : ''}
                ${getAlignmentClass(section.style)}
              `}>
                {/* Grid layout for couplets (2 lines) - stacked vertically with proper spacing */}
                {isCouplet ? (
                  <div className="space-y-3 md:space-y-4">
                    {lines.map((line, lineIndex) => (
                      <p 
                        key={`line-${lineIndex}`}
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : ''}
                          leading-relaxed
                          ${lineIndex === 0 ? 'mb-1' : ''}
                        `}
                      >
                        {line.trim()}
                      </p>
                    ))}
                  </div>
                ) : (
                  // Regular layout for other sections
                  <div className="space-y-2 md:space-y-3">
                    {lines.map((line, lineIndex) => (
                      <p 
                        key={`line-${lineIndex}`}
                        className={`
                          ${section.style === 'header' ? 'font-semibold' : ''}
                          leading-relaxed
                        `}
                      >
                        {line.trim()}
                      </p>
                  ))}
                </div>
              )}
              </div>
              
              {/* Verse number on the right side (RTL) - separate from text */}
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
