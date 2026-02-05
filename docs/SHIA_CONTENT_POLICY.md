# SHIA CONTENT POLICY - MANDATORY REQUIREMENT

## CRITICAL: ALL TRANSLATIONS AND TAFSEER MUST BE FROM SHIA SOURCES ONLY

**This is a STRICT requirement. Do NOT use translations or tafseer from any other sect.**

---

## Approved Shia Sources for Translation

### Urdu Translations (شیعہ ترجمہ)
1. **Tafseer-e-Namoona** (تفسیر نمونہ) - Ayatollah Nasir Makarim Shirazi
2. **Majma al-Bayan** (مجمع البیان) - Allama Tabarsi
3. **Al-Mizan fi Tafsir al-Quran** (المیزان فی تفسیر القرآن) - Allama Tabatabai
4. **Minhaj us-Sadiqeen** (منہاج الصادقین) - Mulla Fathullah Kashani

### English Translations (شیعہ انگریزی ترجمہ)
1. **The Quran with an English Paraphrase** - Ayatollah Nasir Makarim Shirazi
2. **The Study Quran** - Seyyed Hossein Nasr (Shia Scholar)
3. **Ali Quli Qarai Translation** - Shia Approved
4. **Mir Ahmed Ali Translation** - Shia Approved

---

## Approved Shia Sources for Tafseer

### Primary Tafseer Sources (تفسیر)
1. **Tafseer al-Mizan** - Allama Tabatabai (علامہ طباطبائی)
2. **Tafseer Namoona** - Ayatollah Makarim Shirazi (آیت اللہ مکارم شیرازی)
3. **Tafseer al-Qummi** - Ali ibn Ibrahim al-Qummi
4. **Tafseer al-Ayyashi** - Muhammad ibn Masud al-Ayyashi
5. **Majma al-Bayan** - Allama Tabarsi (علامہ طبرسی)
6. **Tafseer al-Safi** - Mulla Muhsin Fayd Kashani
7. **Tafseer Nur al-Thaqalayn** - Abd Ali al-Huwayzi

### Secondary Tafseer Sources
1. **Bihar al-Anwar** (for Quranic references) - Allama Majlisi
2. **Al-Kafi** (for hadith related to verses) - Shaykh al-Kulayni

---

## DO NOT USE (Strictly Prohibited Sources)

**The following sources are NOT to be used:**

- ❌ Tafseer Ibn Kathir (Sunni)
- ❌ Tafseer Jalalayn (Sunni)
- ❌ Tafseer al-Tabari (Sunni)
- ❌ Tafseer al-Qurtubi (Sunni)
- ❌ Tafseer al-Baghawi (Sunni)
- ❌ Any Salafi/Wahhabi translations
- ❌ Saudi-published translations
- ❌ Sahih International translation (Sunni)
- ❌ Pickthall translation (Sunni)
- ❌ Yusuf Ali translation (Sunni)
- ❌ Any translation not verified as Shia

---

## Implementation Guidelines

### For Developers
When adding new translations or tafseer:

1. **Verify the source** - Ensure it's from an approved Shia scholar
2. **Check the translator** - Must be a recognized Shia scholar or institution
3. **Review content** - Ensure it aligns with Shia interpretation
4. **Document the source** - Always include attribution

### For Content
```typescript
interface AyahContent {
  number: number;
  arabicText: string;
  urduTranslation: string;      // MUST BE FROM SHIA SOURCE
  englishTranslation: string;   // MUST BE FROM SHIA SOURCE
  tafseer?: {
    source: string;             // MUST BE SHIA TAFSEER
    text: string;
  };
}
```

---

## Future Tafseer Implementation

When adding tafseer functionality:

1. **Primary Language**: Urdu (from Tafseer Namoona or Al-Mizan)
2. **Secondary Language**: English (from approved Shia translations)
3. **Attribution**: Always show the source name
4. **Verification**: All content must be reviewed for Shia authenticity

### Suggested Tafseer Structure
```typescript
interface Tafseer {
  ayahNumber: number;
  surahNumber: number;
  source: 'al-mizan' | 'namoona' | 'majma-al-bayan';
  urduText: string;
  englishText?: string;
  scholar: string;
}
```

---

## Contact for Verification

For any questions about whether a source is Shia-approved:
- Consult with local Shia scholars
- Reference Hawza publications
- Check Shia institution websites (e.g., al-islam.org)

---

## Last Updated
- Date: January 17, 2026
- Status: MANDATORY POLICY
- This policy applies to ALL Quran-related content

---

**یہ پالیسی لازمی ہے۔ تمام تراجم اور تفسیر صرف شیعہ ذرائع سے ہونی چاہیے۔**

**This policy is MANDATORY. All translations and tafseer must be from Shia sources ONLY.**
