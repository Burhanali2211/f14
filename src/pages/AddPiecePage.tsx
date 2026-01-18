import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Upload, 
  Loader2, 
  Globe, 
  Sparkles,
  Check,
  Image as ImageIcon,
  Type,
  Tag,
  User,
  Languages,
  Video,
  X as XIcon,
  Save,
  BookOpen,
  Mic,
  FileText,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { authenticatedQuery } from '@/lib/db-utils';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth-utils';
import { optimizeRecitationImage } from '@/lib/image-optimizer';
import type { Category, Piece, Imam } from '@/lib/supabase-types';
import { ReciterCombobox } from '@/components/ReciterCombobox';
import { SimpleRecitationEditor } from '@/components/SimpleRecitationEditor';
import { cn } from '@/lib/utils';
import { getUILanguage, setUILanguage, t, UILanguage } from '@/lib/ui-translations';
import { notifyNewRecitation } from '@/lib/telegram-notify';


export default function AddPiecePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role, loading: roleLoading } = useUserRole();
  const isEditing = !!id;
  
  const [uiLang, setUiLang] = useState<UILanguage>(getUILanguage());
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('Hinglish');
  const [targetLanguage, setTargetLanguage] = useState('Kashmiri');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [fetchingContent, setFetchingContent] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiAction, setAiAction] = useState<'improve_recitation' | 'add_pronunciation' | 'summarize' | 'explain' | 'enhance_reading'>('enhance_reading');
  
  const [pieceForm, setPieceForm] = useState({
    title: '',
    category_id: '',
    imam_id: '',
    reciter: '',
    language: 'Kashmiri',
    text_content: '',
    video_url: '',
    image_url: [] as string[],
  });

  const STEPS = [
    { id: 1, name: t('step1', uiLang), icon: Tag },
    { id: 2, name: t('step2', uiLang), icon: Type },
    { id: 3, name: t('step3', uiLang), icon: ImageIcon },
    { id: 4, name: t('step4', uiLang), icon: Save },
  ];

  const handleLanguageChange = (lang: UILanguage) => {
    setUiLang(lang);
    setUILanguage(lang);
  };

  useEffect(() => {
    if (!roleLoading && role !== 'uploader' && role !== 'admin') {
      toast({ title: t('error', uiLang), description: 'You need uploader permissions.', variant: 'destructive' });
      navigate('/');
    }
  }, [role, roleLoading, navigate, uiLang]);

  useEffect(() => {
    if (role === 'admin' || role === 'uploader') {
      fetchData();
    }
  }, [role, id]);

  const fetchData = async () => {
    setLoading(true);
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const CATEGORIES_COLUMNS = 'id, name, slug, description, icon, custom_path';
      const IMAMS_COLUMNS = 'id, name, slug, title, image_url, order_index, category_id';
      const PIECE_COLUMNS = 'id, title, category_id, reciter, language, text_content, video_url, tags, image_url, view_count, created_at, updated_at, imam_id, user_id';

      const [catRes, imamRes] = await Promise.all([
        supabase.from('categories').select(CATEGORIES_COLUMNS).order('name'),
        supabase.from('imams').select(IMAMS_COLUMNS).order('order_index, name'),
      ]);

    if (catRes.data) {
      setCategories(catRes.data as Category[]);
      if (!isEditing && catRes.data.length > 0 && !pieceForm.category_id) {
        setPieceForm(f => ({ ...f, category_id: catRes.data[0].id }));
      }
    }
    if (imamRes.data) {
      setImams(imamRes.data as Imam[]);
    }

    if (isEditing && id) {
      const { data: pieceData, error } = await supabase
          .from('pieces')
          .select(PIECE_COLUMNS)
          .eq('id', id)
          .single();

      if (error) {
        toast({ title: t('error', uiLang), description: 'Failed to load recitation', variant: 'destructive' });
        navigate(role === 'admin' ? '/admin' : '/uploader');
        return;
      }

      const piece = pieceData as Piece;
      // Normalize image_url to array (handle both string and array for backward compatibility)
      const imageUrls = Array.isArray(piece.image_url) 
        ? piece.image_url 
        : piece.image_url 
          ? [piece.image_url] 
          : [];
      
      setPieceForm({
        title: piece.title,
        category_id: piece.category_id,
        imam_id: piece.imam_id || '',
        reciter: piece.reciter || '',
        language: piece.language,
        text_content: piece.text_content,
        video_url: piece.video_url || '',
        image_url: imageUrls,
      });
    }

    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return null;
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({ title: t('error', uiLang), description: 'Please upload an image (JPEG, PNG, WebP)', variant: 'destructive' });
      return null;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t('error', uiLang), description: 'Image too large. Max 10MB', variant: 'destructive' });
      return null;
    }
    
    setUploading(true);
    try {
      const optimizedBlob = await optimizeRecitationImage(file);
      const fileName = `recitation-${Date.now()}.webp`;
      
      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000',
          contentType: 'image/webp',
        });
      
      if (error) {
        toast({ title: t('error', uiLang), description: t('errorUpload', uiLang), variant: 'destructive' });
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('piece-images').getPublicUrl(data.path);
      return publicUrl;
    } catch {
      toast({ title: t('error', uiLang), description: t('errorUpload', uiLang), variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Handle multiple files
    const fileArray = Array.from(files);
    const uploadedUrls: string[] = [];
    
    for (const file of fileArray) {
      const url = await handleImageUpload(file);
      if (url) {
        uploadedUrls.push(url);
      }
    }
    
    if (uploadedUrls.length > 0) {
      setPieceForm(f => ({ 
        ...f, 
        image_url: [...f.image_url, ...uploadedUrls] 
      }));
      toast({ 
        title: t('imageUploaded', uiLang), 
        description: `${uploadedUrls.length} image(s) uploaded` 
      });
    }
    
    // Reset input to allow selecting same files again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };
  
  const handleRemoveImage = (index: number) => {
    setPieceForm(f => ({
      ...f,
      image_url: f.image_url.filter((_, i) => i !== index)
    }));
  };

  const translateText = async () => {
    if (!pieceForm.text_content.trim()) {
      toast({ title: t('error', uiLang), description: 'Enter text to translate', variant: 'destructive' });
      return;
    }

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { text: pieceForm.text_content, sourceLanguage, targetLanguage },
      });

      if (error || data?.error) {
        toast({ title: t('error', uiLang), description: t('errorTranslate', uiLang), variant: 'destructive' });
        return;
      }

      if (data?.translatedText) {
        setPieceForm(f => ({ ...f, text_content: data.translatedText.replace(/\|\|BREAK\|\|/g, '\n\n') }));
        toast({ title: t('translated', uiLang) });
      }
    } catch {
      toast({ title: t('error', uiLang), description: t('errorTranslate', uiLang), variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  const fetchFromWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({ title: t('error', uiLang), description: 'Enter a URL', variant: 'destructive' });
      return;
    }

    if (!checkRateLimit(RATE_LIMITS.upload, () => {})) {
      toast({ title: t('error', uiLang), description: 'Please wait', variant: 'destructive' });
      return;
    }

    setFetchingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-content', {
        body: { url: websiteUrl.trim() },
      });

      if (error || data?.error) {
        toast({ title: t('error', uiLang), description: t('errorFetch', uiLang), variant: 'destructive' });
        return;
      }

      if (data?.success && data.content) {
        setPieceForm(f => ({
          ...f,
          title: data.title || f.title || 'Untitled',
          text_content: data.content,
        }));
        toast({ title: t('contentFetched', uiLang) });
        setFetchDialogOpen(false);
        setWebsiteUrl('');
      }
    } catch {
      toast({ title: t('error', uiLang), description: t('errorFetch', uiLang), variant: 'destructive' });
    } finally {
      setFetchingContent(false);
    }
  };

  const enhanceWithAI = async () => {
    if (!pieceForm.text_content.trim()) {
      toast({ title: t('error', uiLang), description: 'Enter text first', variant: 'destructive' });
      return;
    }

    setAiEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-enhance', {
        body: { text: pieceForm.text_content, action: aiAction, language: pieceForm.language },
      });

      if (error || data?.error) {
        toast({ title: t('error', uiLang), description: t('errorAi', uiLang), variant: 'destructive' });
        return;
      }

      if (data?.success && data.result) {
        setPieceForm(f => ({ ...f, text_content: data.result }));
        toast({ title: t('enhanced', uiLang) });
        setAiDialogOpen(false);
      }
    } catch {
      toast({ title: t('error', uiLang), description: t('errorAi', uiLang), variant: 'destructive' });
    } finally {
      setAiEnhancing(false);
    }
  };

  const savePiece = async () => {
    if (!pieceForm.title || !pieceForm.category_id || !pieceForm.text_content) {
      toast({ title: t('error', uiLang), description: t('requiredFields', uiLang), variant: 'destructive' });
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      toast({ title: t('error', uiLang), description: 'Not authenticated', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const data = {
      title: pieceForm.title,
      category_id: pieceForm.category_id,
      imam_id: pieceForm.imam_id || null,
      reciter: pieceForm.reciter || null,
      language: pieceForm.language,
      text_content: pieceForm.text_content,
      video_url: pieceForm.video_url || null,
      image_url: pieceForm.image_url.length > 0 ? pieceForm.image_url : null,
      user_id: user.id,
    };

    try {
      if (isEditing && id) {
          const { error } = await authenticatedQuery(async () =>
            await supabase.from('pieces').update(data).eq('id', id)
          );
          if (error) throw error;
          toast({ title: t('saved', uiLang), description: t('recitationUpdated', uiLang) });
        } else {
          const { error } = await authenticatedQuery(async () =>
            await supabase.from('pieces').insert([data])
          );
          if (error) throw error;
          
          const categoryName = categories.find(c => c.id === pieceForm.category_id)?.name;
          notifyNewRecitation({
            title: pieceForm.title,
            category: categoryName || 'Unknown',
            language: pieceForm.language,
            reciter: pieceForm.reciter || 'Unknown',
            uploader_name: user.full_name || user.email,
          }).catch(() => {});
          
          toast({ title: t('saved', uiLang), description: t('recitationCreated', uiLang) });
        }
      navigate(role === 'admin' ? '/admin' : '/uploader');
    } catch {
      toast({ title: t('error', uiLang), description: t('errorSave', uiLang), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 1:
        return pieceForm.title.trim() && pieceForm.category_id;
      case 2:
        return pieceForm.text_content.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep || canProceed(currentStep)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < 4 && canProceed(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t('loading', uiLang)}</p>
        </div>
      </div>
    );
  }

  if (role !== 'uploader' && role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl py-4 px-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <Link 
            to={role === 'admin' ? '/admin' : '/uploader'}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('back', uiLang)}
          </Link>

          <div className="flex items-center bg-muted rounded-full p-1">
            <button
              onClick={() => handleLanguageChange('ur')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all",
                uiLang === 'ur' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              اردو
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all",
                uiLang === 'en' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              English
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {isEditing ? t('editRecitation', uiLang) : t('newRecitation', uiLang)}
          </h1>
        </div>

        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => goToStep(step.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                  currentStep === step.id && "bg-primary/10",
                  step.id < currentStep && "text-primary",
                  step.id > currentStep && !canProceed(step.id - 1) && "opacity-40"
                )}
                disabled={step.id > currentStep && !canProceed(step.id - 1)}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  currentStep === step.id && "bg-primary text-primary-foreground",
                  step.id < currentStep && "bg-primary/20 text-primary",
                  step.id > currentStep && "bg-muted text-muted-foreground"
                )}>
                  {step.id < currentStep ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{step.name}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-6 h-0.5 mx-1",
                  step.id < currentStep ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {currentStep === 1 && (
            <div className="p-4 sm:p-6 space-y-5">
              <div className="text-center pb-4 border-b">
                <Tag className="w-8 h-8 mx-auto text-primary mb-2" />
                <h2 className="font-semibold">{t('basicDetails', uiLang)}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Type className="w-4 h-4" />
                    {t('title', uiLang)} *
                  </Label>
                  <Input
                    value={pieceForm.title}
                    onChange={(e) => setPieceForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('titlePlaceholder', uiLang)}
                    className="h-12 text-base rounded-xl"
                    dir={uiLang === 'ur' ? 'rtl' : 'ltr'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4" />
                      {t('category', uiLang)} *
                    </Label>
                    <Select
                      value={pieceForm.category_id}
                      onValueChange={(v) => setPieceForm(f => ({ ...f, category_id: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder={t('selectCategory', uiLang)} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Languages className="w-4 h-4" />
                      {t('language', uiLang)}
                    </Label>
                    <Select
                      value={pieceForm.language}
                      onValueChange={(v) => setPieceForm(f => ({ ...f, language: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kashmiri">{t('kashmiri', uiLang)}</SelectItem>
                        <SelectItem value="Urdu">{t('urdu', uiLang)}</SelectItem>
                        <SelectItem value="Arabic">{t('arabic', uiLang)}</SelectItem>
                        <SelectItem value="Persian">{t('persian', uiLang)}</SelectItem>
                        <SelectItem value="English">{t('english', uiLang)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    {t('inHonorOf', uiLang)}
                  </Label>
                  <Select
                    value={pieceForm.imam_id || "none"}
                    onValueChange={(v) => setPieceForm(f => ({ ...f, imam_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder={t('optional', uiLang)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('none', uiLang)}</SelectItem>
                      {imams.map(imam => (
                        <SelectItem key={imam.id} value={imam.id}>{imam.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4" />
                    {t('reciter', uiLang)}
                  </Label>
                  <ReciterCombobox
                    value={pieceForm.reciter}
                    onChange={(value) => setPieceForm(f => ({ ...f, reciter: value }))}
                    placeholder={t('optional', uiLang)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="text-center pb-4 border-b">
                <Type className="w-8 h-8 mx-auto text-primary mb-2" />
                <h2 className="font-semibold">{t('enterText', uiLang)}</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">{t('translateFrom', uiLang)}</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hinglish">{t('hinglish', uiLang)}</SelectItem>
                      <SelectItem value="English">{t('english', uiLang)}</SelectItem>
                      <SelectItem value="Kashmiri">{t('kashmiri', uiLang)}</SelectItem>
                      <SelectItem value="Urdu">{t('urdu', uiLang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{t('translateTo', uiLang)}</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="h-9 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kashmiri">{t('kashmiri', uiLang)}</SelectItem>
                      <SelectItem value="Urdu">{t('urdu', uiLang)}</SelectItem>
                      <SelectItem value="Arabic">{t('arabic', uiLang)}</SelectItem>
                      <SelectItem value="English">{t('english', uiLang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SimpleRecitationEditor
                value={pieceForm.text_content}
                onChange={(value) => setPieceForm(f => ({ ...f, text_content: value }))}
                language={targetLanguage}
                title={pieceForm.title}
                reciter={pieceForm.reciter}
                onTranslate={translateText}
                onAiEnhance={() => setAiDialogOpen(true)}
                onFetchFromWebsite={() => setFetchDialogOpen(true)}
                translating={translating}
                aiEnhancing={aiEnhancing}
                fetchingContent={fetchingContent}
                uiLanguage={uiLang}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-4 sm:p-6 space-y-5">
              <div className="text-center pb-4 border-b">
                <ImageIcon className="w-8 h-8 mx-auto text-primary mb-2" />
                <h2 className="font-semibold">{t('imageVideo', uiLang)}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <ImageIcon className="w-4 h-4" />
                    {t('coverImage', uiLang)} {pieceForm.image_url.length > 0 && `(${pieceForm.image_url.length})`}
                  </Label>
                  
                  {pieceForm.image_url.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {pieceForm.image_url.map((url, index) => (
                          <div key={index} className="relative rounded-xl overflow-hidden border-2 border-dashed border-primary/30 group">
                            <img 
                              src={url} 
                              alt={`Page ${index + 1}`} 
                              className="w-full h-32 object-cover cursor-pointer"
                              onClick={() => {
                                setImageViewerUrl(url);
                                setImageViewerOpen(true);
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              Page {index + 1}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveImage(index)}
                            >
                              <XIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full h-10 rounded-xl gap-2"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            {t('addMoreImages', uiLang)}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      ) : (
                        <>
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="w-7 h-7 text-primary" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">{t('uploadImage', uiLang)}</p>
                            <p className="text-xs text-muted-foreground">{t('tapToUpload', uiLang)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t('multipleImagesSupported', uiLang)}</p>
                          </div>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4" />
                    {t('youtubeUrl', uiLang)}
                  </Label>
                  <Input
                    value={pieceForm.video_url}
                    onChange={(e) => setPieceForm(f => ({ ...f, video_url: e.target.value }))}
                    placeholder="https://youtube.com/..."
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="p-4 sm:p-6 space-y-5">
              <div className="text-center pb-4 border-b">
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2" />
                <h2 className="font-semibold">{t('readyToSave', uiLang)}</h2>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-sm mb-3">{t('summary', uiLang)}</h3>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">{t('title', uiLang)}:</div>
                  <div className="font-medium truncate">{pieceForm.title || '-'}</div>
                  
                  <div className="text-muted-foreground">{t('category', uiLang)}:</div>
                  <div>{categories.find(c => c.id === pieceForm.category_id)?.name || '-'}</div>
                  
                  <div className="text-muted-foreground">{t('language', uiLang)}:</div>
                  <div>{pieceForm.language}</div>
                  
                  <div className="text-muted-foreground">{t('inHonorOf', uiLang)}:</div>
                  <div>{imams.find(i => i.id === pieceForm.imam_id)?.name || t('none', uiLang)}</div>
                  
                  <div className="text-muted-foreground">{t('reciter', uiLang)}:</div>
                  <div>{pieceForm.reciter || '-'}</div>
                  
                  <div className="text-muted-foreground">{t('step2', uiLang)}:</div>
                  <div>{pieceForm.text_content.trim().split(/\s+/).length} {t('words', uiLang)}</div>
                  
                  <div className="text-muted-foreground">{t('step3', uiLang)}:</div>
                  <div>{pieceForm.image_url.length > 0 ? `${pieceForm.image_url.length} ${t('images', uiLang)}` : t('no', uiLang)}</div>
                </div>
              </div>

              <Button
                onClick={savePiece}
                disabled={saving}
                className="w-full h-14 text-lg rounded-xl gap-2"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('saving', uiLang)}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEditing ? t('saveChanges', uiLang) : t('saveRecitation', uiLang)}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 safe-area-pb">
        <div className="container max-w-2xl flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="h-12 px-6 rounded-xl gap-2"
          >
            {uiLang === 'ur' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t('previous', uiLang)}
          </Button>
          
          <div className="flex items-center gap-1">
            {STEPS.map(step => (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentStep === step.id ? "w-6 bg-primary" : 
                  step.id < currentStep ? "bg-primary/60" : "bg-muted"
                )}
              />
            ))}
          </div>
          
          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed(currentStep)}
              className="h-12 px-6 rounded-xl gap-2"
            >
              {t('next', uiLang)}
              {uiLang === 'ur' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          ) : (
            <Button
              onClick={savePiece}
              disabled={saving}
              className="h-12 px-6 rounded-xl gap-2 bg-green-600 hover:bg-green-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t('save', uiLang)}
            </Button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={onImageSelect}
      />

      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-4xl p-0">
          {imageViewerUrl && (
            <div className="relative">
              <img src={imageViewerUrl} alt="Preview" className="w-full" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setImageViewerOpen(false)}
              >
                <XIcon className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('fetchFromWeb', uiLang)}
            </DialogTitle>
            <DialogDescription>
              {t('enterUrl', uiLang)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-12 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && !fetchingContent && fetchFromWebsite()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFetchDialogOpen(false)}>
              {t('cancel', uiLang)}
            </Button>
            <Button onClick={fetchFromWebsite} disabled={fetchingContent || !websiteUrl.trim()}>
              {fetchingContent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
              {t('fetch', uiLang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {t('aiEnhance', uiLang)}
            </DialogTitle>
            <DialogDescription>
              {t('selectEnhancement', uiLang)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={aiAction} onValueChange={(v) => setAiAction(v as typeof aiAction)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="enhance_reading" className="text-xs">
                  <FileText className="w-4 h-4 mr-1" />
                  {t('enhance', uiLang)}
                </TabsTrigger>
                <TabsTrigger value="improve_recitation" className="text-xs">
                  <Mic className="w-4 h-4 mr-1" />
                  {t('recitation', uiLang)}
                </TabsTrigger>
              </TabsList>
              <TabsList className="grid w-full grid-cols-2 mt-1">
                <TabsTrigger value="add_pronunciation" className="text-xs">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {t('pronunciation', uiLang)}
                </TabsTrigger>
                <TabsTrigger value="explain" className="text-xs">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  {t('explanation', uiLang)}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              {t('cancel', uiLang)}
            </Button>
            <Button onClick={enhanceWithAI} disabled={aiEnhancing || !pieceForm.text_content.trim()}>
              {aiEnhancing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t('apply', uiLang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
