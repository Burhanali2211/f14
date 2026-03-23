/**
 * Chronological revelation order for all 114 Surahs.
 * Based on the Egyptian (Al-Azhar) Standard — the most widely accepted
 * academic ordering used by Islamic scholars worldwide.
 *
 * Key: Surah number (1-114)
 * Value: Position in revelation sequence (1 = first revealed, 114 = last)
 *
 * Surahs 1-86 revealed in Mecca, 87-114 revealed in Medina.
 */
export const REVELATION_ORDER: Record<number, number> = {
  // ── Meccan Surahs ──────────────────────────────────────────────────────
  96: 1,   // Al-Alaq       — First revelation
  68: 2,   // Al-Qalam
  73: 3,   // Al-Muzzammil
  74: 4,   // Al-Muddaththir
  1:  5,   // Al-Fatiha
  111: 6,  // Al-Masad
  81: 7,   // At-Takwir
  87: 8,   // Al-Ala
  92: 9,   // Al-Layl
  89: 10,  // Al-Fajr
  93: 11,  // Ad-Duha
  94: 12,  // Ash-Sharh
  103: 13, // Al-Asr
  100: 14, // Al-Adiyat
  108: 15, // Al-Kawthar
  102: 16, // At-Takathur
  107: 17, // Al-Maun
  109: 18, // Al-Kafirun
  105: 19, // Al-Fil
  113: 20, // Al-Falaq
  114: 21, // An-Nas
  112: 22, // Al-Ikhlas
  53: 23,  // An-Najm
  80: 24,  // Abasa
  97: 25,  // Al-Qadr
  91: 26,  // Ash-Shams
  85: 27,  // Al-Buruj
  95: 28,  // At-Tin
  106: 29, // Quraish
  101: 30, // Al-Qaria
  75: 31,  // Al-Qiyamah
  104: 32, // Al-Humazah
  77: 33,  // Al-Mursalat
  50: 34,  // Qaf
  90: 35,  // Al-Balad
  86: 36,  // At-Tariq
  54: 37,  // Al-Qamar
  38: 38,  // Sad
  7:  39,  // Al-Araf
  72: 40,  // Al-Jinn
  36: 41,  // Ya-Sin
  25: 42,  // Al-Furqan
  35: 43,  // Fatir
  19: 44,  // Maryam
  20: 45,  // Ta-Ha
  56: 46,  // Al-Waqia
  26: 47,  // Ash-Shuara
  27: 48,  // An-Naml
  28: 49,  // Al-Qasas
  17: 50,  // Al-Isra
  10: 51,  // Yunus
  11: 52,  // Hud
  12: 53,  // Yusuf
  15: 54,  // Al-Hijr
  6:  55,  // Al-Anam
  37: 56,  // As-Saffat
  31: 57,  // Luqman
  34: 58,  // Saba
  39: 59,  // Az-Zumar
  40: 60,  // Ghafir
  41: 61,  // Fussilat
  42: 62,  // Ash-Shura
  43: 63,  // Az-Zukhruf
  44: 64,  // Ad-Dukhan
  45: 65,  // Al-Jathiyah
  46: 66,  // Al-Ahqaf
  51: 67,  // Adh-Dhariyat
  88: 68,  // Al-Ghashiyah
  18: 69,  // Al-Kahf
  16: 70,  // An-Nahl
  71: 71,  // Nuh
  14: 72,  // Ibrahim
  21: 73,  // Al-Anbiya
  23: 74,  // Al-Muminun
  32: 75,  // As-Sajdah
  52: 76,  // At-Tur
  67: 77,  // Al-Mulk
  69: 78,  // Al-Haqqah
  70: 79,  // Al-Maarij
  78: 80,  // An-Naba
  79: 81,  // An-Naziat
  82: 82,  // Al-Infitar
  84: 83,  // Al-Inshiqaq
  30: 84,  // Ar-Rum
  29: 85,  // Al-Ankabut
  83: 86,  // Al-Mutaffifin
  // ── Medinan Surahs ─────────────────────────────────────────────────────
  2:  87,  // Al-Baqarah   — First Medinan revelation
  8:  88,  // Al-Anfal
  3:  89,  // Aal-e-Imran
  33: 90,  // Al-Ahzab
  60: 91,  // Al-Mumtahanah
  4:  92,  // An-Nisa
  99: 93,  // Az-Zalzalah
  57: 94,  // Al-Hadid
  47: 95,  // Muhammad
  13: 96,  // Ar-Rad
  55: 97,  // Ar-Rahman
  76: 98,  // Al-Insan
  65: 99,  // At-Talaq
  98: 100, // Al-Bayyinah
  59: 101, // Al-Hashr
  24: 102, // An-Nur
  22: 103, // Al-Hajj
  63: 104, // Al-Munafiqun
  58: 105, // Al-Mujadalah
  49: 106, // Al-Hujurat
  66: 107, // At-Tahrim
  64: 108, // At-Taghabun
  61: 109, // As-Saff
  62: 110, // Al-Jumah
  48: 111, // Al-Fath
  5:  112, // Al-Maidah
  9:  113, // At-Tawbah
  110: 114, // An-Nasr     — Last revealed
};

/** Returns the ordinal revelation position for a given surah number. */
export function getRevelationOrder(surahNumber: number): number {
  return REVELATION_ORDER[surahNumber] ?? surahNumber;
}

/** Returns all 114 surah numbers sorted chronologically (revelation order). */
export function getSurahsInRevelationOrder(surahNumbers: number[]): number[] {
  return [...surahNumbers].sort(
    (a, b) => (REVELATION_ORDER[a] ?? a) - (REVELATION_ORDER[b] ?? b),
  );
}
