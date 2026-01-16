const LANG_STORAGE_KEY = 'upload_page_language';

export type UILanguage = 'ur' | 'en';

export function getUILanguage(): UILanguage {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'ur') {
      return stored;
    }
  } catch {}
  return 'ur';
}

export function setUILanguage(lang: UILanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export const translations = {
  ur: {
    back: 'واپس',
    newRecitation: 'نئی تلاوت',
    editRecitation: 'ترمیم کریں',
    loading: 'لوڈ ہو رہا ہے...',
    
    step1: 'معلومات',
    step2: 'متن',
    step3: 'تصویر',
    step4: 'محفوظ',
    
    basicDetails: 'بنیادی معلومات',
    title: 'عنوان',
    titlePlaceholder: 'مثال: یا نبی سلام علیک',
    titleRequired: 'عنوان ضروری ہے',
    
    category: 'قسم',
    categoryRequired: 'قسم ضروری ہے',
    selectCategory: 'منتخب کریں',
    
    language: 'زبان',
    kashmiri: 'کشمیری',
    urdu: 'اردو',
    arabic: 'عربی',
    persian: 'فارسی',
    english: 'انگریزی',
    
    inHonorOf: 'کی شان میں',
    none: 'کوئی نہیں',
    optional: 'اختیاری',
    
    reciter: 'قاری',
    
    enterText: 'متن لکھیں',
    translateFrom: 'ترجمہ سے',
    translateTo: 'ترجمہ میں',
    hinglish: 'ہنگلش',
    
    imageVideo: 'تصویر اور ویڈیو',
    coverImage: 'تصویر',
    uploadImage: 'تصویر اپلوڈ کریں',
    tapToUpload: 'یہاں ٹیپ کریں',
    tapToView: 'تصویر دیکھنے کیلئے ٹیپ کریں',
    remove: 'ہٹائیں',
    addMoreImages: 'مزید تصاویر شامل کریں',
    multipleImagesSupported: 'آپ کثیر الصفحات تلاوتوں کے لیے متعدد تصاویر اپلوڈ کر سکتے ہیں',
    images: 'تصاویر',
    youtubeUrl: 'یوٹیوب لنک',
    
    readyToSave: 'تیار ہے!',
    summary: 'خلاصہ',
    words: 'الفاظ',
    yes: 'ہے',
    no: 'نہیں',
    
    save: 'محفوظ کریں',
    saving: 'محفوظ ہو رہا ہے...',
    saveRecitation: 'تلاوت محفوظ کریں',
    saveChanges: 'تبدیلیاں محفوظ کریں',
    
    previous: 'پچھلا',
    next: 'اگلا',
    
    fetchFromWeb: 'ویب سے لائیں',
    enterUrl: 'URL درج کریں',
    fetch: 'لائیں',
    cancel: 'منسوخ',
    
    aiEnhance: 'AI بہتری',
    selectEnhancement: 'بہتری کی قسم منتخب کریں',
    enhance: 'بہتر بنائیں',
    recitation: 'تلاوت',
    pronunciation: 'تلفظ',
    explanation: 'وضاحت',
    apply: 'لاگو کریں',
    
    imageUploaded: 'تصویر اپلوڈ ہوگئی',
    translated: 'ترجمہ ہوگیا',
    contentFetched: 'مواد لایا گیا',
    enhanced: 'بہتری ہوگئی',
    saved: 'محفوظ ہوگیا!',
    recitationUpdated: 'تلاوت اپڈیٹ ہوگئی',
    recitationCreated: 'تلاوت بن گئی',
    
    error: 'خرابی',
    errorUpload: 'اپلوڈ ناکام',
    errorTranslate: 'ترجمہ ناکام',
    errorFetch: 'لانا ناکام',
    errorAi: 'AI ناکام',
    errorSave: 'محفوظ کرنا ناکام',
    requiredFields: 'عنوان، قسم اور متن ضروری ہیں',
    
    selectLanguage: 'زبان منتخب کریں',
  },
  en: {
    back: 'Back',
    newRecitation: 'New Recitation',
    editRecitation: 'Edit Recitation',
    loading: 'Loading...',
    
    step1: 'Details',
    step2: 'Text',
    step3: 'Image',
    step4: 'Save',
    
    basicDetails: 'Basic Details',
    title: 'Title',
    titlePlaceholder: 'e.g., Ya Nabi Salam Alayka',
    titleRequired: 'Title is required',
    
    category: 'Category',
    categoryRequired: 'Category is required',
    selectCategory: 'Select',
    
    language: 'Language',
    kashmiri: 'Kashmiri',
    urdu: 'Urdu',
    arabic: 'Arabic',
    persian: 'Persian',
    english: 'English',
    
    inHonorOf: 'In Honor Of',
    none: 'None',
    optional: 'Optional',
    
    reciter: 'Reciter',
    
    enterText: 'Enter Text',
    translateFrom: 'From',
    translateTo: 'To',
    hinglish: 'Hinglish',
    
    imageVideo: 'Image & Video',
    coverImage: 'Cover Image',
    uploadImage: 'Upload Image',
    tapToUpload: 'Tap here to upload',
    tapToView: 'Tap to view full image',
    remove: 'Remove',
    addMoreImages: 'Add More Images',
    multipleImagesSupported: 'You can upload multiple images for multi-page recitations',
    images: 'images',
    youtubeUrl: 'YouTube URL',
    
    readyToSave: 'Ready!',
    summary: 'Summary',
    words: 'words',
    yes: 'Yes',
    no: 'No',
    
    save: 'Save',
    saving: 'Saving...',
    saveRecitation: 'Save Recitation',
    saveChanges: 'Save Changes',
    
    previous: 'Previous',
    next: 'Next',
    
    fetchFromWeb: 'Fetch from Web',
    enterUrl: 'Enter URL',
    fetch: 'Fetch',
    cancel: 'Cancel',
    
    aiEnhance: 'AI Enhance',
    selectEnhancement: 'Select enhancement type',
    enhance: 'Enhance',
    recitation: 'Recitation',
    pronunciation: 'Pronunciation',
    explanation: 'Explanation',
    apply: 'Apply',
    
    imageUploaded: 'Image uploaded',
    translated: 'Translated',
    contentFetched: 'Content fetched',
    enhanced: 'Enhanced',
    saved: 'Saved!',
    recitationUpdated: 'Recitation updated',
    recitationCreated: 'Recitation created',
    
    error: 'Error',
    errorUpload: 'Upload failed',
    errorTranslate: 'Translation failed',
    errorFetch: 'Fetch failed',
    errorAi: 'AI failed',
    errorSave: 'Save failed',
    requiredFields: 'Title, category, and text are required',
    
    selectLanguage: 'Select Language',
  },
};

export type TranslationKeys = keyof typeof translations.en;

export function t(key: TranslationKeys, lang: UILanguage): string {
  return translations[lang][key] || translations.en[key] || key;
}
