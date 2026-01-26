export interface Ayah {
  number: number;
  arabicText: string;
  urduTranslation: string;
  englishTranslation: string;
}

export interface SurahVerses {
  surahNumber: number;
  bismillah: boolean;
  ayahs: Ayah[];
}

export const surah1AlFatiha: SurahVerses = {
  surahNumber: 1,
  bismillah: false,
  ayahs: [
    {
      number: 1,
      arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      urduTranslation: 'شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے',
      englishTranslation: 'In the name of Allah, the Most Gracious, the Most Merciful.',
    },
    {
      number: 2,
      arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      urduTranslation: 'سب تعریف اللہ کے لیے ہے جو تمام جہانوں کا پالنے والا ہے',
      englishTranslation: 'All praise is due to Allah, Lord of all the worlds.',
    },
    {
      number: 3,
      arabicText: 'الرَّحْمَٰنِ الرَّحِيمِ',
      urduTranslation: 'بڑا مہربان نہایت رحم والا',
      englishTranslation: 'The Most Gracious, the Most Merciful.',
    },
    {
      number: 4,
      arabicText: 'مَالِكِ يَوْمِ الدِّينِ',
      urduTranslation: 'روزِ جزا کا مالک',
      englishTranslation: 'Master of the Day of Judgment.',
    },
    {
      number: 5,
      arabicText: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      urduTranslation: 'ہم تیری ہی عبادت کرتے ہیں اور تجھ ہی سے مدد چاہتے ہیں',
      englishTranslation: 'You alone we worship, and You alone we ask for help.',
    },
    {
      number: 6,
      arabicText: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      urduTranslation: 'ہمیں سیدھا راستہ دکھا',
      englishTranslation: 'Guide us on the Straight Path.',
    },
    {
      number: 7,
      arabicText: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
      urduTranslation: 'ان لوگوں کا راستہ جن پر تو نے انعام کیا، نہ ان کا جن پر غضب ہوا اور نہ گمراہوں کا',
      englishTranslation: 'The path of those upon whom You have bestowed favor, not of those who have earned Your anger or of those who have gone astray.',
    },
  ],
};
