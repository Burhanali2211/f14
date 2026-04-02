
const fs = require('fs');
const path = require('path');

const SQL_FILE = 'd:\\f14\\quran-uthmani.sql';
const VERSES_DIR = 'd:\\f14\\src\\data\\quran\\verses';
const SURAHS_FILE = 'd:\\f14\\src\\data\\quran\\surahs.ts';

// Tanzil-style Bismillah as found in the SQL
const QURAN_BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

function parseSql() {
  const content = fs.readFileSync(SQL_FILE, 'utf8');
  const suras = {};
  const regex = /\((\d+),\s*(\d+),\s*(\d+),\s*'(.*?)'\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const sId = parseInt(match[2]);
    const aId = parseInt(match[3]);
    let text = match[4].replace(/''/g, "'");
    if (!suras[sId]) suras[sId] = {};
    suras[sId][aId] = text;
  }
  return suras;
}

function getSurahNames() {
  const content = fs.readFileSync(SURAHS_FILE, 'utf8');
  // Simple extraction: number: X, englishName: '...'
  const surahs = {};
  const regex = /number:\s*(\d+),[\s\S]*?englishName:\s*['"](.*?)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    surahs[parseInt(match[1])] = match[2].replace(/[^a-zA-Z]/g, '');
  }
  return surahs;
}

function processAllSurahs(quranData, surahNames) {
  for (let sId = 1; sId <= 114; sId++) {
    const fileName = `surah-${sId}.ts`;
    const filePath = path.join(VERSES_DIR, fileName);
    const suraData = quranData[sId];
    if (!suraData) {
      console.warn(`Missing data for Surah ${sId}`);
      continue;
    }

    if (fs.existsSync(filePath)) {
      // Update existing file
      let content = fs.readFileSync(filePath, 'utf8');
      const ayahRegex = /\{\s*number:\s*(\d+),[\s\S]*?arabicText:\s*['"`](.*?)['"`],/g;
      let updatedContent = content.replace(ayahRegex, (match, ayaNumStr, currentArabic) => {
        const ayaNum = parseInt(ayaNumStr);
        let newText = suraData[ayaNum];
        if (newText) {
          if (sId !== 1 && ayaNum === 1 && newText.startsWith(QURAN_BISMILLAH)) {
            newText = newText.substring(QURAN_BISMILLAH.length).trim();
          }
          const escaped = newText.replace(/'/g, "\\'");
          return match.replace(/arabicText:\s*['"`].*?['"`]/, `arabicText: '${escaped}'`);
        }
        return match;
      });
      // Update bismillah if it's a string
      updatedContent = updatedContent.replace(/bismillah:\s*['"`].*?['"`]/, `bismillah: '${QURAN_BISMILLAH}'`);
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated existing ${fileName}`);
    } else {
      // Create new file
      const name = surahNames[sId] || `Surah${sId}`;
      const variableName = `surah${sId}${name}`;
      
      let ayahsStr = '';
      const ayaNumbers = Object.keys(suraData).sort((a,b) => a-b);
      ayaNumbers.forEach(ayaNum => {
        let text = suraData[ayaNum];
        if (sId !== 1 && parseInt(ayaNum) === 1 && text.startsWith(QURAN_BISMILLAH)) {
          text = text.substring(QURAN_BISMILLAH.length).trim();
        }
        const escaped = text.replace(/'/g, "\\'");
        ayahsStr += `    {\n      number: ${ayaNum},\n      arabicText: '${escaped}',\n      urduTranslation: '',\n      englishTranslation: '',\n    },\n`;
      });

      const template = `import { SurahVerses } from './surah-1';

export const ${variableName}: SurahVerses = {
  surahNumber: ${sId},
  bismillah: ${sId === 9 ? 'false' : 'true'},
  ayahs: [
${ayahsStr}  ],
};
`;
      fs.writeFileSync(filePath, template, 'utf8');
      console.log(`Created new ${fileName}`);
    }
  }
}

const quran = parseSql();
const names = getSurahNames();
processAllSurahs(quran, names);
