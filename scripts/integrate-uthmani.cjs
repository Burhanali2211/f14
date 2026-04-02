
const fs = require('fs');
const path = require('path');

const SQL_FILE = 'd:\\f14\\quran-uthmani.sql';
const VERSES_DIR = 'd:\\f14\\src\\data\\quran\\verses';

// Tanzil-style Bismillah as found in the SQL
const QURAN_BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

function parseSql() {
  const content = fs.readFileSync(SQL_FILE, 'utf8');
  const suras = {};
  
  // Regex to extract (index, sura, aya, 'text')
  // We handle both INSERT formats and continued values
  const regex = /\((\d+),\s*(\d+),\s*(\d+),\s*'(.*?)'\)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const sId = parseInt(match[2]);
    const aId = parseInt(match[3]);
    let text = match[4];
    
    // Unescape SQL quotes if any
    text = text.replace(/''/g, "'");
    
    if (!suras[sId]) suras[sId] = {};
    suras[sId][aId] = text;
  }
  
  console.log(`Parsed ${Object.keys(suras).length} Surahs from SQL.`);
  return suras;
}

function processFiles(quranData) {
  const files = fs.readdirSync(VERSES_DIR).filter(f => f.startsWith('surah-') && f.endsWith('.ts'));
  
  files.forEach(file => {
    const filePath = path.join(VERSES_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the surah number in the file
    const surahNumMatch = content.match(/surahNumber:\s*(\d+)/);
    if (!surahNumMatch) return;
    const surahNum = parseInt(surahNumMatch[1]);
    
    const suraData = quranData[surahNum];
    if (!suraData) {
      console.warn(`No SQL data for Surah ${surahNum} (${file})`);
      return;
    }
    
    // Update individual ayahs
    // We'll use a regex that handles both single and double quotes for keys
    // the structure is: { number: 1, arabicText: '...', ... }
    
    let updatedContent = content;
    
    // Regex to match an Aya block
    // We use a more robust regex that can handle both multi-line and single-line Aya objects
    const ayahRegex = /\{\s*number:\s*(\d+),[\s\S]*?arabicText:\s*['"`](.*?)['"`],/g;
    
    updatedContent = content.replace(ayahRegex, (match, ayaNumStr, currentArabic) => {
      const ayaNum = parseInt(ayaNumStr);
      let newText = suraData[ayaNum];
      
      if (newText) {
        // Strip Bismillah if it's not Surah 1 and it's Aya 1
        if (surahNum !== 1 && ayaNum === 1) {
          if (newText.startsWith(QURAN_BISMILLAH)) {
            newText = newText.substring(QURAN_BISMILLAH.length).trim();
          }
        }
        
        // Escape single quotes for TypeScript template literal or string
        const escaped = newText.replace(/'/g, "\\'");
        
        // Return replaced block
        // We preserve the rest of the block by matching and replacing only the arabicText part
        const replacedMatch = match.replace(/arabicText:\s*['"`].*?['"`]/, `arabicText: '${escaped}'`);
        return replacedMatch;
      }
      return match;
    });
    
    // Also update bismillah field if it exists as a string
    updatedContent = updatedContent.replace(/bismillah:\s*['"`].*?['"`]/, `bismillah: '${QURAN_BISMILLAH}'`);
    
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes needed for ${file}`);
    }
  });
}

const data = parseSql();
processFiles(data);

// Update Bismillah component
const bismillahFile = 'd:\\f14\\src\\components\\quran\\Bismillah.tsx';
if (fs.existsSync(bismillahFile)) {
  let content = fs.readFileSync(bismillahFile, 'utf8');
  // Regex to match the Arabic text in Bismillah component
  const bismillahCompRegex = />\s*بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*<\/p>/;
  if (bismillahCompRegex.test(content)) {
    content = content.replace(bismillahCompRegex, `>${QURAN_BISMILLAH}</p>`);
    fs.writeFileSync(bismillahFile, content, 'utf8');
    console.log('Updated Bismillah.tsx');
  }
}
