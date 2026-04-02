import os
import re

SQL_FILE = r'd:\f14\quran-uthmani.sql'
DATA_DIR = r'd:\f14\src\data\quran\verses'

def update_quran():
    print("Reading SQL file...")
    with open(SQL_FILE, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Regex to extract: (index, sura, aya, 'text')
    # Example: (66, 1, 1, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ')
    pattern = re.compile(r"\((\d+),\s*(\d+),\s*(\d+),\s*'(.*?)'\)")
    
    quran_data = {}
    matches = pattern.findall(sql_content)
    print(f"Parsed {len(matches)} ayahs.")

    for idx, sura, aya, text in matches:
        s_num = int(sura)
        a_num = int(aya)
        if s_num not in quran_data:
            quran_data[s_num] = []
        quran_data[s_num].append((a_num, text))

    for s_num in range(1, 115):
        file_path = os.path.join(DATA_DIR, f"surah-{s_num}.ts")
        if not os.path.exists(file_path):
            print(f"Skipping missing file: {file_path}")
            continue

        print(f"Updating Surah {s_num}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Preserve existing translations
        translations = {}
        # Simple extraction of translations if they exist
        # number: 1, ... urduTranslation: '...', englishTranslation: '...'
        ayah_blocks = re.findall(r"\{\s*number:\s*(\d+).*?\}", content, re.DOTALL)
        for block_num in ayah_blocks:
            a_num = int(block_num)
            # Find the block text for this ayah
            block_match = re.search(fr"\{\s*number:\s*{a_num}.*?\}", content, re.DOTALL)
            if block_match:
                block_text = block_match.group(0)
                urdu = re.search(r"urduTranslation:\s*['\"](.*?)['\"]", block_text)
                english = re.search(r"englishTranslation:\s*['\"](.*?)['\"]", block_text)
                translations[a_num] = {
                    'urdu': urdu.group(1) if urdu else "",
                    'english': english.group(1) if english else ""
                }

        # Extract metadata
        var_name_match = re.search(r"export const (\w+)", content)
        var_name = var_name_match.group(1) if var_name_match else f"surah{s_num}"
        bismillah = "true" if 'bismillah: true' in content else "false"

        # Construct new ayahs array
        new_ayahs = []
        if s_num in quran_data:
            for a_num, text in sorted(quran_data[s_num]):
                trans = translations.get(a_num, {'urdu': "", 'english': ""})
                # Escape single quotes in text
                safe_text = text.replace("'", "\\'")
                safe_urdu = trans['urdu'].replace("'", "\\'")
                safe_eng = trans['english'].replace("'", "\\'")
                
                ayah_obj = f"""    {{
      number: {a_num},
      arabicText: '{safe_text}',
      urduTranslation: '{safe_urdu}',
      englishTranslation: '{safe_eng}',
    }},"""
                new_ayahs.append(ayah_obj)

        new_content = f"""import {{ SurahVerses }} from './surah-1';

export const {var_name}: SurahVerses = {{
  surahNumber: {s_num},
  bismillah: {bismillah},
  ayahs: [
{"\n".join(new_ayahs)}
  ],
}};
"""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    print("Success!")

if __name__ == "__main__":
    update_quran()
