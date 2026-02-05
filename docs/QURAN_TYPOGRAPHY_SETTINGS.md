# Quran Typography Settings - LOCKED CONFIGURATION

**WARNING: DO NOT CHANGE THESE SETTINGS - They have been carefully optimized for perfect readability and NO overlapping on any device.**

---

## Font Family

**Primary Font:** `AlMajeed` (loaded from Supabase Storage)

**Font URL:**
```
https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/13ea1992-c5c6-4007-81d7-949502de4b7e/Al-Majeed-Quranic-Font_shiped-1768619679428.ttf
```

- Used for ALL Arabic text throughout the app
- Used for Urdu translations  
- Used for Arabic numbers
- Used for Quran verses
- Used for Surah/Para names

---

## CSS Classes Configuration

### 1. Quran Arabic Text (`.quran-arabic-text`) - PRIMARY CLASS FOR ALL ARABIC

**USE THIS CLASS FOR ALL ARABIC TEXT IN THE APP**

```css
.quran-arabic-text {
  font-family: 'AlMajeed', var(--font-arabic-heading);
  font-weight: 400;
  line-height: 3.2;          /* CRITICAL: Do not reduce */
  word-spacing: 0.12em;
  letter-spacing: 0.01em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: block;
  padding-top: 0.5em;
  padding-bottom: 0.5em;
}
```

**When using in list items (smaller text), add these overrides:**
- `!leading-none` or `!leading-tight` - for compact layouts
- `!p-0` or `!py-0.5` - to reduce padding in list items
- Always add `dir="rtl"` attribute to the element

**Font Sizes (Responsive):**
- Mobile: `text-2xl` (1.5rem / 24px)
- Small screens: `text-3xl` (1.875rem / 30px)
- Medium screens: `text-[2rem]` (32px)
- Large screens: `text-[2.25rem]` (36px)

---

### 2. Quran Urdu Translation (`.quran-urdu-text`)

```css
.quran-urdu-text {
  font-family: 'AlMajeed', 'Noto Nastaliq Urdu', var(--font-arabic);
  font-weight: 400;
  line-height: 2.8;          /* CRITICAL: Do not reduce */
  word-spacing: 0.1em;
  letter-spacing: 0.01em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: block;
  padding-top: 0.3em;
  padding-bottom: 0.3em;
}
```

**Font Sizes (Responsive):**
- Mobile: `text-lg` (1.125rem / 18px)
- Small screens: `text-xl` (1.25rem / 20px)
- Medium screens: `text-[1.35rem]` (21.6px)

---

## Critical Values - DO NOT CHANGE

| Property | Arabic Text | Urdu Text |
|----------|-------------|-----------|
| **line-height** | 3.2 | 2.8 |
| **padding-top** | 0.5em | 0.3em |
| **padding-bottom** | 0.5em | 0.3em |
| **word-spacing** | 0.12em | 0.1em |

---

## Font Loading (index.css)

```css
@font-face {
  font-family: 'AlMajeed';
  src: url('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/13ea1992-c5c6-4007-81d7-949502de4b7e/Al-Majeed-Quranic-Font_shiped-1768619679428.ttf') format('truetype');
  font-display: swap;
}
```

---

## CSS Variables (index.css :root)

```css
--font-arabic: 'AlMajeed', 'Noto Nastaliq Urdu', 'Cairo', 'Tajawal', 'Noto Sans Arabic', 'IBM Plex Sans Arabic', 'Amiri', 'Lateef', system-ui, sans-serif;
--font-arabic-heading: 'AlMajeed', 'Noto Nastaliq Urdu', 'Lateef', 'Cairo', 'Tajawal', 'Noto Sans Arabic', system-ui, sans-serif;
```

---

## Components Using AlMajeed Font

### QuranHeader Component
- Location: `src/components/quran/QuranHeader.tsx`
- Uses `.quran-arabic-text` for "القرآن الکریم" heading

### AyahDisplay Component
- Location: `src/components/quran/AyahDisplay.tsx`
- Uses `.quran-arabic-text` for Arabic verse
- Uses `.quran-urdu-text` for Urdu translation
- Uses `font-sans` for English translation

### Bismillah Component
- Location: `src/components/quran/Bismillah.tsx`
- Uses `.quran-arabic-text` class

### SurahListItem Component
- Location: `src/components/quran/SurahListItem.tsx`
- Uses `.quran-arabic-text` for:
  - Surah number (Arabic numerals)
  - Surah Arabic name
  - Verse count
  - Revelation type (مکی/مدنی)

### ParaListItem Component
- Location: `src/components/quran/ParaListItem.tsx`
- Uses `.quran-arabic-text` for:
  - Para number (Arabic numerals)
  - Para Arabic name
  - Start/End surah names with ayah numbers

---

## Usage Examples

### For Quran Verses (full spacing):
```tsx
<p className="quran-arabic-text text-2xl sm:text-3xl" dir="rtl" lang="ar">
  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
</p>
```

### For List Items (compact):
```tsx
<span className="quran-arabic-text text-2xl !leading-tight !py-1" dir="rtl">
  الفاتحة
</span>
```

### For Arabic Numbers in Badges:
```tsx
<span className="quran-arabic-text text-2xl !leading-none !p-0">
  {toArabicNumber(1)}
</span>
```

---

## Why These Settings?

1. **line-height: 3.2** - AlMajeed font has tall diacritical marks (harakat). This spacing ensures no overlap between lines.

2. **padding-top/bottom** - Adds breathing room around text blocks to prevent any clipping.

3. **word-spacing: 0.12em** - Improves readability of Arabic words without spreading them too far apart.

4. **display: block** - Ensures line-height applies correctly to the entire text block.

5. **AlMajeed font** - Beautiful Quranic font with proper harakat (diacritical marks) support.

---

## Last Updated
- Date: January 17, 2026
- Status: LOCKED - Working perfectly on all devices
- Tested: Mobile, Tablet, Desktop

---

**REMINDER: These settings are final and should NOT be modified without extensive testing across all device sizes.**

**ALL ARABIC TEXT MUST USE `.quran-arabic-text` CLASS WITH AlMajeed FONT.**

---

## IMPORTANT: Content Policy

**See `SHIA_CONTENT_POLICY.md` for mandatory translation and tafseer requirements.**

All translations (Urdu & English) and tafseer MUST be from Shia sources ONLY. This is a strict requirement with no exceptions.
