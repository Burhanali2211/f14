export type { Ayah, SurahVerses } from './surah-1';
import type { SurahVerses } from './surah-1';

// import.meta.glob creates one lazy chunk per surah file that actually exists on disk.
// Rollup resolves glob patterns against the filesystem at build time — so there is
// never a "could not resolve" error even if some surah files are not yet added.
// Adding a new surah-N.ts automatically makes it available here with no edits required.
const surahGlob = import.meta.glob<Record<string, SurahVerses>>('./surah-*.ts');

export async function getSurahVerses(surahNumber: number): Promise<SurahVerses | undefined> {
  const path = `./surah-${surahNumber}.ts`;
  const loader = surahGlob[path];
  if (!loader) return undefined;
  const mod = await loader();
  // Each file exports exactly one SurahVerses object as a named export.
  // Find it by matching the surahNumber field.
  return Object.values(mod).find(
    (v): v is SurahVerses =>
      typeof v === 'object' &&
      v !== null &&
      'surahNumber' in v &&
      (v as SurahVerses).surahNumber === surahNumber
  );
}
