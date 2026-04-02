
import fs from 'fs';

const SQL_FILE = 'd:\\f14\\quran-uthmani.sql';

const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
const pattern = /\((\d+),\s*95,\s*1,\s*'(.*?)'\)/;
const match = pattern.exec(sqlContent);
if (match) {
    const text = match[2];
    console.log(`S95 Ayah 1: ${text}`);
    console.log(`Hex: ${Buffer.from(text).toString('hex')}`);
} else {
    console.log("No match found for S95 A1");
}

