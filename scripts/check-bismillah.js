
import fs from 'fs';

const SQL_FILE = 'd:\\f14\\quran-uthmani.sql';

const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
const pattern = /\((\d+),\s*(\d+),\s*1,\s*'(.*?)'\)/g;

let match;
while ((match = pattern.exec(sqlContent)) !== null) {
    const sNum = match[2];
    const text = match[4];
    if (text && (text.includes('بِسْمِ') || text.includes('بِّسْمِ'))) {
        console.log(`S${sNum}: ${text.substring(0, 45)}...`);
    } else if (!text) {
        console.warn(`S${sNum}: undefined text at ${match.index}`);
    }
}

