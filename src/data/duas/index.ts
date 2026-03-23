export type { Dua, DuaCategory, DuaCategoryInfo } from './types';
export { ziyaratAshura, ziyaratArbaeen } from './ziyarat-ashura';
export { duaKumail, duaAhd } from './duas-imams';
export { tasbeehaFatima, taaqibatNamazJumla, duaAfterFajr } from './taqibaat';
export { duaTawassul, duaNudba, duaFaraj } from './general';

import type { DuaCategoryInfo } from './types';
import { ziyaratAshura, ziyaratArbaeen } from './ziyarat-ashura';
import { duaKumail, duaAhd } from './duas-imams';
import { tasbeehaFatima, taaqibatNamazJumla, duaAfterFajr } from './taqibaat';
import { duaTawassul, duaNudba, duaFaraj } from './general';

export const duaCategories: DuaCategoryInfo[] = [
  {
    id: 'ziyarat',
    name: 'Ziyarat',
    nameAr: 'الزيارات',
    description: 'Salutations and visitations to the Holy Prophet (s.a.w.), the Imams, and the martyrs of Karbala',
    color: 'emerald',
    duas: [ziyaratAshura, ziyaratArbaeen],
  },
  {
    id: 'duas-imams',
    name: 'Duas of the Imams',
    nameAr: 'أدعية الأئمة',
    description: 'Sacred supplications taught directly by the Holy Imams of Ahlul Bayt (a.s.)',
    color: 'violet',
    duas: [duaKumail, duaAhd],
  },
  {
    id: 'taqibaat',
    name: 'Taqibaat e Nimaaz',
    nameAr: 'تعقيبات الصلاة',
    description: 'Post-prayer supplications and recommended recitations after each Salat',
    color: 'amber',
    duas: [tasbeehaFatima, taaqibatNamazJumla, duaAfterFajr],
  },
  {
    id: 'general',
    name: 'General Shia Duas',
    nameAr: 'الأدعية العامة',
    description: 'Widely recited duas including Tawassul, Nudba, Faraj, and other beloved supplications',
    color: 'rose',
    duas: [duaTawassul, duaNudba, duaFaraj],
  },
];

export const allDuas = duaCategories.flatMap(cat => cat.duas);

export function getDuaById(id: string) {
  return allDuas.find(d => d.id === id) ?? null;
}
