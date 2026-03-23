export type DuaCategory = 'ziyarat' | 'duas-imams' | 'taqibaat' | 'general';

export interface Dua {
  id: string;
  name: string;
  nameAr: string;
  nameUrdu?: string;
  category: DuaCategory;
  description: string;
  occasion?: string;
  source?: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
}

export interface DuaCategoryInfo {
  id: DuaCategory;
  name: string;
  nameAr: string;
  description: string;
  color: string;
  duas: Dua[];
}
