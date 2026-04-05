import React, { useState, memo } from 'react';
import { MoreHorizontal, Bookmark, BookOpen, Eye, EyeOff, Share2 } from 'lucide-react';
import { toArabicNumber } from '@/lib/quran-types';
import type { Ayah } from '@/data/quran/verses';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AyahDisplayProps {
  ayah: Ayah;
  surahNumber: number;
  surahName?: string;
  showUrdu?: boolean;
  showEnglish?: boolean;
  arabicFontSize?: number;
  urduFontSize?: number;
  englishFontSize?: number;
  lineSpacing?: number;
  charGap?: number;
}

const AyahDisplayComponent = ({
  ayah,
  surahNumber,
  surahName = '',
  showUrdu = true,
  showEnglish = true,
  arabicFontSize = 22,
  urduFontSize = 17,
  englishFontSize = 14,
  lineSpacing = 3.2,
  charGap = 0.02,
}: AyahDisplayProps) => {

  const saveBookmark = () => {
    const existing = JSON.parse(localStorage.getItem('f14-bookmarks') || '[]');
    const newBookmark = {
      surahNumber,
      surahName,
      ayahNumber: ayah.number,
      timestamp: Date.now()
    };
    // Avoid duplicates
    const filtered = existing.filter((b: any) => !(b.surahNumber === surahNumber && b.ayahNumber === ayah.number));
    localStorage.setItem('f14-bookmarks', JSON.stringify([newBookmark, ...filtered].slice(0, 50)));
    alert('Ayah Bookmarked!');
  };

  const markLastRead = () => {
    localStorage.setItem('f14-last-read', JSON.stringify({
      surahNumber,
      surahName,
      ayahNumber: ayah.number,
      timestamp: Date.now()
    }));
    alert('Last Read Position Updated!');
  };

  return (
    <div className="group relative bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 overflow-hidden hover:border-primary/30 transition-all duration-500 shadow-soft hover:shadow-card">
      <div className="p-4 sm:p-6">

        {/* Ayah header with Menu */}
        <div className="flex items-center justify-between mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-xl hover:bg-primary/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-primary border border-border/40 active:scale-95">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl border-border/40 backdrop-blur-xl bg-card/95">
              <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-2">Ayah {surahNumber}:{ayah.number} Actions</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/20" />
              <DropdownMenuItem onClick={markLastRead} className="text-sm font-medium h-11 rounded-xl cursor-pointer">
                <BookOpen className="w-4 h-4 mr-3 text-primary" /> Mark as Last Read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={saveBookmark} className="text-sm font-medium h-11 rounded-xl cursor-pointer">
                <Bookmark className="w-4 h-4 mr-3 text-primary" /> Bookmark Ayah
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const url = window.location.href.split('#')[0] + `#ayah-${ayah.number}`;
                navigator.clipboard.writeText(url);
                alert('Ayah link copied!');
              }} className="text-sm font-medium h-11 rounded-xl cursor-pointer">
                <Share2 className="w-4 h-4 mr-3 text-primary" /> Copy Share Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
             <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                Ayah {ayah.number}
             </span>
             <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
          </div>
        </div>

        {/* Arabic text */}
        <div dir="rtl" lang="ar" className="mb-0.5">
          <p
            className="quran-arabic-text text-foreground text-right"
            dir="rtl"
            lang="ar"
            style={{ fontSize: arabicFontSize, lineHeight: lineSpacing }}
          >
            {ayah.arabicText}
            {' '}
            <span className="relative inline-flex items-center justify-center align-middle h-7 w-7">
              <span className="quran-arabic-text text-2xl text-primary/40 leading-none absolute">﴿﴾</span>
              <span className="text-[9px] font-bold text-primary select-none tabular-nums pt-1.5">
                {toArabicNumber(ayah.number)}
              </span>
            </span>
          </p>
        </div>

        {/* Urdu translation */}
        {showUrdu && ayah.urduTranslation && (
          <div
            dir="rtl"
            lang="ur"
            className="mt-2.5 pt-2.5 border-t border-border/20"
          >
            <p
              className="quran-urdu-text text-muted-foreground text-right leading-relaxed"
              style={{ fontSize: urduFontSize }}
            >
              {ayah.urduTranslation}
            </p>
          </div>
        )}

        {/* English translation */}
        {showEnglish && ayah.englishTranslation && (
          <div className="mt-2.5 pt-2.5 border-t border-border/20">
            <p
              className="text-muted-foreground/85 font-sans leading-relaxed"
              style={{ fontSize: englishFontSize }}
            >
              {ayah.englishTranslation}
            </p>
          </div>
        )}



      </div>
    </div>
  );
};

export const AyahDisplay = memo(AyahDisplayComponent);
AyahDisplay.displayName = 'AyahDisplay';
