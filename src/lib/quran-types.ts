export type RevelationType = 'meccan' | 'medinan';

export interface Surah {
  number: number;
  arabicName: string;
  englishName: string;
  englishMeaning: string;
  verseCount: number;
  revelationType: RevelationType;
  rukuCount: number;
  startJuz: number;
}

export interface Para {
  number: number;
  arabicName: string;
  englishName: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export interface Ayah {
  number: number;
  surahNumber: number;
  arabicText: string;
  translations: {
    [key: string]: string;
  };
  juzNumber: number;
}

export const arabicNumbers: { [key: number]: string } = {
  0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
  5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩'
};

export function toArabicNumber(num: number): string {
  return num.toString().split('').map(d => arabicNumbers[parseInt(d)]).join('');
}
