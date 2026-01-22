export { surah1AlFatiha } from './surah-1';
export type { Ayah, SurahVerses } from './surah-1';

import { surah1AlFatiha, SurahVerses } from './surah-1';
import { surah67AlMulk } from './surah-67';
import { surah68AlQalam } from './surah-68';
import { surah69AlHaqqah } from './surah-69';
import { surah70AlMaarij } from './surah-70';
import { surah71Nuh } from './surah-71';
import { surah72AlJinn } from './surah-72';
import { surah73AlMuzzammil } from './surah-73';
import { surah78AnNaba } from './surah-78';
import { surah79AnNaziat } from './surah-79';
import { surah80Abasa } from './surah-80';
import { surah81AtTakwir } from './surah-81';
import { surah82AlInfitar } from './surah-82';
import { surah83AlMutaffifin } from './surah-83';
import { surah84AlInshiqaq } from './surah-84';
import { surah85AlBuruj } from './surah-85';
import { surah86AtTariq } from './surah-86';
import { surah87AlAla } from './surah-87';
import { surah88AlGhashiyah } from './surah-88';
import { surah89AlFajr } from './surah-89';
import { surah90AlBalad } from './surah-90';
import { surah91AshShams } from './surah-91';
import { surah92AlLayl } from './surah-92';
import { surah93AdDuha } from './surah-93';
import { surah94AshSharh } from './surah-94';
import { surah95AtTin } from './surah-95';
import { surah96AlAlaq } from './surah-96';
import { surah97AlQadr } from './surah-97';
import { surah98AlBayyinah } from './surah-98';
import { surah99AzZalzalah } from './surah-99';
import { surah100AlAdiyat } from './surah-100';
import { surah101AlQariah } from './surah-101';
import { surah102AtTakathur } from './surah-102';
import { surah103AlAsr } from './surah-103';
import { surah104AlHumazah } from './surah-104';
import { surah105AlFil } from './surah-105';
import { surah106Quraish } from './surah-106';
import { surah107AlMaun } from './surah-107';
import { surah108AlKawthar } from './surah-108';
import { surah109AlKafirun } from './surah-109';
import { surah110AnNasr } from './surah-110';
import { surah111AlMasad } from './surah-111';
import { surah112AlIkhlas } from './surah-112';
import { surah113AlFalaq } from './surah-113';
import { surah114AnNas } from './surah-114';

export const surahVersesMap: Record<number, SurahVerses> = {
  1: surah1AlFatiha,
  67: surah67AlMulk,
  68: surah68AlQalam,
  69: surah69AlHaqqah,
  70: surah70AlMaarij,
  71: surah71Nuh,
  72: surah72AlJinn,
  73: surah73AlMuzzammil,
  78: surah78AnNaba,
  79: surah79AnNaziat,
  80: surah80Abasa,
  81: surah81AtTakwir,
  82: surah82AlInfitar,
  83: surah83AlMutaffifin,
  84: surah84AlInshiqaq,
  85: surah85AlBuruj,
  86: surah86AtTariq,
  87: surah87AlAla,
  88: surah88AlGhashiyah,
  89: surah89AlFajr,
  90: surah90AlBalad,
  91: surah91AshShams,
  92: surah92AlLayl,
  93: surah93AdDuha,
  94: surah94AshSharh,
  95: surah95AtTin,
  96: surah96AlAlaq,
  97: surah97AlQadr,
  98: surah98AlBayyinah,
  99: surah99AzZalzalah,
  100: surah100AlAdiyat,
  101: surah101AlQariah,
  102: surah102AtTakathur,
  103: surah103AlAsr,
  104: surah104AlHumazah,
  105: surah105AlFil,
  106: surah106Quraish,
  107: surah107AlMaun,
  108: surah108AlKawthar,
  109: surah109AlKafirun,
  110: surah110AnNasr,
  111: surah111AlMasad,
  112: surah112AlIkhlas,
  113: surah113AlFalaq,
  114: surah114AnNas,
};

export function getSurahVerses(surahNumber: number): SurahVerses | undefined {
  return surahVersesMap[surahNumber];
}
