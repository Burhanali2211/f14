import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQL_FILE = 'd:\\f14\\quran-uthmani.sql';
const DATA_DIR = 'd:\\f14\\src\\data\\quran\\verses';

function updateQuran() {
    console.log("Reading SQL file...");
    const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

    // Regex to extract: (index, sura, aya, 'text')
    // Values part: (66, 1, 1, '...')
    const pattern = /\((\d+),\s*(\d+),\s*(\d+),\s*'(.*?)'\)/g;
    
    const quranData = {};
    let match;
    let count = 0;
    while ((match = pattern.exec(sqlContent)) !== null) {
        const sNum = parseInt(match[2]);
        const aNum = parseInt(match[3]);
        const text = match[4];
        if (!quranData[sNum]) quranData[sNum] = [];
        quranData[sNum].push({ number: aNum, text });
        count++;
    }
    console.log(`Parsed ${count} ayahs across ${Object.keys(quranData).length} surahs.`);

    for (let sNum = 1; sNum <= 114; sNum++) {
        const filePath = path.join(DATA_DIR, `surah-${sNum}.ts`);
        if (!fs.existsSync(filePath)) {
            console.warn(`Skipping missing file: ${filePath}`);
            continue;
        }

        console.log(`Updating Surah ${sNum}...`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract existing translations
        const translations = {};
        const ayahRegex = /\{\s*number:\s*(\d+),[\s\S]*?\}/g;
        let ayahMatch;
        while ((ayahMatch = ayahRegex.exec(content)) !== null) {
            const block = ayahMatch[0];
            const aNum = parseInt(ayahMatch[1]);
            
            // Safer extraction using non-greedy match that respects escaped quotes
            // This covers: property: 'text' or property: "text"
            const urduMatch = block.match(/urduTranslation:\s*(['"])([\s\S]*?)(?<!\\)\1/);
            const engMatch = block.match(/englishTranslation:\s*(['"])([\s\S]*?)(?<!\\)\1/);
            
            translations[aNum] = {
                urdu: urduMatch ? urduMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"') : "",
                english: engMatch ? engMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"') : ""
            };
        }

        // Extract metadata
        const varMatch = content.match(/export const (\w+)/);
        const varName = varMatch ? varMatch[1] : `surah${sNum}`;
        const bismillah = content.includes('bismillah: true');

        // Construct new ayahs array
        const sortedAyahs = quranData[sNum] ? quranData[sNum].sort((a, b) => a.number - b.number) : [];
        const bismillahPrefixes = [
            "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ",
            "بِّسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ "
        ];

        const newAyahs = sortedAyahs.map(a => {
            const trans = translations[a.number] || { urdu: "", english: "" };
            let arabicText = a.text;

            // Strip Bismillah prefix from Ayah 1 if it's not Surah 1 (Al-Fatiha)
            if (sNum > 1 && a.number === 1) {
                for (const prefix of bismillahPrefixes) {
                    if (arabicText.startsWith(prefix)) {
                        console.log(`Stripping Bismillah from Surah ${sNum} Ayah 1`);
                        arabicText = arabicText.substring(prefix.length);
                        break;
                    }
                }
            }

            // Use JSON.stringify to safely handle all escape characters
            const safeText = JSON.stringify(arabicText);
            const safeUrdu = JSON.stringify(trans.urdu || "");
            const safeEng = JSON.stringify(trans.english || "");
            
            return `    {
      number: ${a.number},
      arabicText: ${safeText},
      urduTranslation: ${safeUrdu},
      englishTranslation: ${safeEng},
    },`;
        }).join('\n');




        const newContent = `import { SurahVerses } from './surah-1';

export const ${varName}: SurahVerses = {
  surahNumber: ${sNum},
  bismillah: ${bismillah},
  ayahs: [
${newAyahs}
  ],
};
`;
        fs.writeFileSync(filePath, newContent, 'utf8');
    }

    console.log("Success!");
}

updateQuran();
