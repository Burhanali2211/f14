import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, Languages, Scissors, Maximize2, X as XIcon, Loader2, Globe, Sparkles, BookOpen, Mic, FileText, Lightbulb, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { Category, Piece, Imam } from '@/lib/supabase-types';

export default function AddPiecePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role, loading: roleLoading } = useUserRole();
  const isEditing = !!id;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [permissions, setPermissions] = useState<{ categoryIds: string[]; imamIds: string[] }>({ categoryIds: [], imamIds: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('Hinglish');
  const [targetLanguage, setTargetLanguage] = useState('Kashmiri');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [breakPointDialogOpen, setBreakPointDialogOpen] = useState(false);
  const [breakPointStyle, setBreakPointStyle] = useState<'right' | 'center' | 'indent' | 'left'>('right');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const breakPointCursorPos = useRef<{ start: number; end: number } | null>(null);
  
  // Website fetching
  const [fetchingContent, setFetchingContent] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fetchDialogOpen, setFetchDialogOpen] = useState(false);
  
  // AI enhancements
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
    audio_url: '',
    video_url: '',
    image_url: '',
  });

  useEffect(() => {
    checkAuth();
  }, [role, roleLoading]);

  useEffect(() => {
    if (role === 'admin' || role === 'uploader') {
      fetchData();
    }
  }, [role, id]);

  const checkAuth = async () => {
    if (roleLoading) {
      return;
    }
    
    if (role !== 'uploader' && role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You need uploader or admin permissions to access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch user permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let categoryIds: string[] = [];
    let imamIds: string[] = [];

    if (role === 'uploader') {
      const { data: perms } = await supabase
        .from('uploader_permissions')
        .select('category_id, imam_id')
        .eq('user_id', user.id);

      categoryIds = perms?.filter(p => p.category_id).map(p => p.category_id!) || [];
      imamIds = perms?.filter(p => p.imam_id).map(p => p.imam_id!) || [];

      setPermissions({ categoryIds, imamIds });
    }

    // Fetch categories and imams
    const [catRes, imamRes] = await Promise.all([
      role === 'admin' 
        ? supabase.from('categories').select('*').order('name')
        : supabase.from('categories').select('*').in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']).order('name'),
      role === 'admin'
        ? supabase.from('imams').select('*').order('order_index, name')
        : supabase.from('imams').select('*').in('id', imamIds.length > 0 ? imamIds : ['00000000-0000-0000-0000-000000000000']).order('order_index, name'),
    ]);

    if (catRes.data) {
      setCategories(catRes.data as Category[]);
      // Set default category if creating new piece
      if (!isEditing && catRes.data.length > 0 && !pieceForm.category_id) {
        setPieceForm(f => ({ ...f, category_id: catRes.data[0].id }));
      }
    }
    if (imamRes.data) {
      setImams(imamRes.data as Imam[]);
    }

    // If editing, fetch the piece data
    if (isEditing && id) {
      const { data: pieceData, error } = await supabase
        .from('pieces')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load recitation data',
          variant: 'destructive',
        });
        navigate(role === 'admin' ? '/admin' : '/uploader');
        return;
      }

      const piece = pieceData as Piece;
      
      // Check permissions for uploaders
      if (role === 'uploader' && user) {
        // Re-fetch permissions if needed
        const { data: perms } = await supabase
          .from('uploader_permissions')
          .select('category_id, imam_id')
          .eq('user_id', user.id);

        const categoryIds = perms?.filter(p => p.category_id).map(p => p.category_id!) || [];
        const imamIds = perms?.filter(p => p.imam_id).map(p => p.imam_id!) || [];

        const hasCategoryPerm = categoryIds.includes(piece.category_id);
        const hasImamPerm = !piece.imam_id || imamIds.includes(piece.imam_id);
        
        if (!hasCategoryPerm || !hasImamPerm) {
          toast({
            title: 'Permission Denied',
            description: 'You do not have permission to edit this recitation.',
            variant: 'destructive',
          });
          navigate('/uploader');
          return;
        }
      }

      setPieceForm({
        title: piece.title,
        category_id: piece.category_id,
        imam_id: piece.imam_id || '',
        reciter: piece.reciter || '',
        language: piece.language,
        text_content: piece.text_content,
        audio_url: piece.audio_url || '',
        video_url: piece.video_url || '',
          image_url: piece.image_url || '',
        });
      }

    setLoading(false);
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    if (!file) return null;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({ 
        title: 'Error', 
        description: 'Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)', 
        variant: 'destructive' 
      });
      return null;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({ 
        title: 'Error', 
        description: 'File too large. Maximum size is 10MB', 
        variant: 'destructive' 
      });
      return null;
    }
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      logger.debug('Uploading image:', { fileName, size: file.size, type: file.type });
      
      // Upload with upsert option and proper content type
      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      
      if (error) {
        logger.error('Image upload error:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('Bucket not found')) {
          toast({ 
            title: 'Error', 
            description: 'Storage bucket not found. Please contact an administrator.', 
            variant: 'destructive' 
          });
        } else if (error.message?.includes('new row violates row-level security')) {
          toast({ 
            title: 'Error', 
            description: 'Permission denied. You may not have permission to upload images.', 
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: 'Error', 
            description: error.message || 'Failed to upload image. Please try again.', 
            variant: 'destructive' 
          });
        }
        return null;
      }
      
      if (!data?.path) {
        logger.error('Upload succeeded but no path returned');
        toast({ 
          title: 'Error', 
          description: 'Upload succeeded but failed to get image URL', 
          variant: 'destructive' 
        });
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data.path);
      
      logger.debug('Image uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      logger.error('Unexpected error during image upload:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'An unexpected error occurred during upload', 
        variant: 'destructive' 
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await handleImageUpload(file);
    if (url) {
      setPieceForm(f => ({ ...f, image_url: url }));
      toast({ title: 'Success', description: 'Image uploaded' });
    }
  };

  // Add break point function
  const openBreakPointDialog = () => {
    const textarea = document.getElementById('piece-text') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    breakPointCursorPos.current = { start, end };
    setBreakPointDialogOpen(true);
  };

  const addBreakPoint = (style: 'right' | 'center' | 'indent' | 'left' = 'right') => {
    if (!breakPointCursorPos.current) {
      const textarea = document.getElementById('piece-text') as HTMLTextAreaElement;
      if (!textarea) return;
      breakPointCursorPos.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    }
    
    const { start, end } = breakPointCursorPos.current;
    const text = pieceForm.text_content;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);
    
    // Insert break marker with style at cursor position
    const marker = style === 'right' ? '||BREAK||' : `||BREAK:${style}||`;
    const newText = beforeText + '\n\n' + marker + '\n\n' + afterText;
    setPieceForm(f => ({ ...f, text_content: newText }));
    
    // Restore cursor position
    setTimeout(() => {
      const textarea = document.getElementById('piece-text') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        const newPos = start + marker.length + 4; // +4 for \n\n before and after
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
    
    breakPointCursorPos.current = null;
    setBreakPointDialogOpen(false);
    toast({ 
      title: 'Break point added', 
      description: `Paragraph break with ${style} alignment inserted` 
    });
  };

  // Template patterns
  const templates = {
    'alternating-center': {
      name: 'Alternating with Center',
      pattern: ['center', 'right', 'left', 'right', 'left', 'center'],
      description: 'First: Center, then alternates Right-Left, ends with Center'
    },
    'alternating-right-left': {
      name: 'Alternating Right-Left',
      pattern: ['right', 'left', 'right', 'left', 'right', 'left'],
      description: 'Alternates between Right and Left alignment'
    },
    'center-bookends': {
      name: 'Center Bookends',
      pattern: ['center', 'right', 'right', 'right', 'center'],
      description: 'Starts and ends with Center, Right in between'
    },
    'all-right': {
      name: 'All Right Aligned',
      pattern: ['right', 'right', 'right', 'right', 'right'],
      description: 'All sections right-aligned (standard for Urdu/Arabic)'
    },
    'indent-conclusion': {
      name: 'Indented Conclusion',
      pattern: ['right', 'right', 'right', 'indent', 'indent'],
      description: 'Right-aligned sections, indented conclusion'
    }
  };

  // Apply template - can add new break points or style existing ones
  const applyTemplate = () => {
    if (!selectedTemplate) return;
    
    const template = templates[selectedTemplate as keyof typeof templates];
    if (!template) return;

    let text = pieceForm.text_content;
    
    // Find all existing break points (with or without styles)
    const breakRegex = /\|\|BREAK(?::\w+)?\|\|/g;
    const breaks: Array<{ index: number; fullMatch: string }> = [];
    let match;
    
    while ((match = breakRegex.exec(text)) !== null) {
      breaks.push({
        index: match.index,
        fullMatch: match[0]
      });
    }
    
    // If no break points exist, ask user where to add them
    if (breaks.length === 0) {
      // Split text by double newlines (paragraph breaks) to add break points
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      
      if (paragraphs.length < 2) {
        toast({
          title: 'Not enough content',
          description: 'Please add at least 2 paragraphs separated by blank lines, or add break points manually first',
          variant: 'destructive'
        });
        return;
      }
      
      // Add break points between paragraphs with template pattern
      let result = '';
      paragraphs.forEach((paragraph, index) => {
        if (index > 0) {
          // Add break point with template style
          const patternIndex = (index - 1) % template.pattern.length;
          const style = template.pattern[patternIndex];
          const marker = style === 'right' ? '||BREAK||' : `||BREAK:${style}||`;
          result += '\n\n' + marker + '\n\n';
        }
        result += paragraph.trim();
      });
      
      setPieceForm(f => ({ ...f, text_content: result }));
      setTemplateDialogOpen(false);
      setSelectedTemplate(null);
      
      toast({
        title: 'Template applied',
        description: `Added ${paragraphs.length - 1} break point(s) with "${template.name}" pattern`
      });
      return;
    }
    
    // Apply template pattern to existing break points
    let result = text;
    let offset = 0;
    
    breaks.forEach((breakPoint, index) => {
      const patternIndex = index % template.pattern.length;
      const newStyle = template.pattern[patternIndex];
      const newMarker = newStyle === 'right' ? '||BREAK||' : `||BREAK:${newStyle}||`;
      
      // Replace the old marker with new one
      const before = result.substring(0, breakPoint.index + offset);
      const after = result.substring(breakPoint.index + offset + breakPoint.fullMatch.length);
      result = before + newMarker + after;
      
      // Adjust offset for next replacement
      offset += newMarker.length - breakPoint.fullMatch.length;
    });
    
    setPieceForm(f => ({ ...f, text_content: result }));
    setTemplateDialogOpen(false);
    setSelectedTemplate(null);
    
    toast({
      title: 'Template applied',
      description: `Applied "${template.name}" pattern to ${breaks.length} break point(s)`
    });
  };

  // Translate function with language support
  const translateText = async () => {
    if (!pieceForm.text_content.trim()) {
      toast({ title: 'Error', description: 'Enter text to translate', variant: 'destructive' });
      return;
    }

    setTranslating(true);
    try {
      logger.debug('Translating text', { sourceLanguage, targetLanguage, textLength: pieceForm.text_content.length });
      
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { 
          text: pieceForm.text_content,
          sourceLanguage,
          targetLanguage
        },
      });

      // Check for error in response data first (function returned error in body)
      if (data?.error) {
        logger.error('Translation API error:', data.error);
        toast({ 
          title: 'Translation Error', 
          description: data.error || 'Translation failed', 
          variant: 'destructive' 
        });
        return;
      }

      if (error) {
        logger.error('Translation function error:', error);
        
        // Try to extract error message from error object
        let errorMsg = error.message || 'Translation failed';
        
        // If error has context, try to get the actual error message
        if (error.context && error.context.body) {
          try {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            if (errorBody.error) {
              errorMsg = errorBody.error;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Provide more specific error messages
        if (error.message?.includes('CORS') || error.message?.includes('Failed to send')) {
          toast({ 
            title: 'Translation Error', 
            description: 'Translation service is unavailable. Please try again later or contact support.', 
            variant: 'destructive' 
          });
        } else {
          toast({ 
            title: 'Translation Error', 
            description: errorMsg, 
            variant: 'destructive' 
          });
        }
        return;
      }

      if (data?.translatedText) {
        // Clean up break markers (convert ||BREAK|| to double newlines)
        const cleanedText = data.translatedText.replace(/\|\|BREAK\|\|/g, '\n\n');
        setPieceForm(f => ({ ...f, text_content: cleanedText }));
        toast({ title: 'Success', description: `Text translated to ${targetLanguage}` });
        logger.debug('Translation successful');
      } else {
        logger.warn('Translation returned no text');
        toast({ 
          title: 'Warning', 
          description: 'Translation completed but no text was returned', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      logger.error('Translation error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Translation failed. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setTranslating(false);
    }
  };

  // Fetch content from website
  const fetchFromWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({ title: 'Error', description: 'Please enter a website URL', variant: 'destructive' });
      return;
    }

    // Check rate limit
    if (!checkRateLimit(RATE_LIMITS.upload, (remaining, resetTime) => {
      toast({
        title: 'Rate limit exceeded',
        description: `Please wait ${Math.ceil(resetTime / 1000)} seconds before fetching again.`,
        variant: 'destructive',
      });
    })) {
      return;
    }

    setFetchingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-content', {
        body: { url: websiteUrl.trim() },
      });

      if (error) {
        logger.error('Fetch content error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch content from website',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch content',
          variant: 'destructive',
        });
        return;
      }

      if (data?.success && data.content) {
        // Populate form with fetched content
        setPieceForm(f => ({
          ...f,
          title: data.title || f.title || 'Untitled',
          text_content: data.content,
        }));

        // Set language if detected
        if (data.metadata?.language) {
          const detectedLang = data.metadata.language.includes('Kashmiri') ? 'Kashmiri' :
                              data.metadata.language.includes('Urdu') ? 'Urdu' :
                              data.metadata.language.includes('Arabic') ? 'Arabic' :
                              data.metadata.language.includes('English') ? 'English' : f.language;
          setPieceForm(f => ({ ...f, language: detectedLang }));
        }

        toast({
          title: 'Success',
          description: `Content fetched from ${new URL(websiteUrl).hostname}`,
        });
        setFetchDialogOpen(false);
        setWebsiteUrl('');
      } else {
        toast({
          title: 'Warning',
          description: 'No content found on the website',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      logger.error('Fetch content error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFetchingContent(false);
    }
  };

  // AI enhancement function
  const enhanceWithAI = async () => {
    if (!pieceForm.text_content.trim()) {
      toast({ title: 'Error', description: 'Please enter text to enhance', variant: 'destructive' });
      return;
    }

    // Check rate limit
    if (!checkRateLimit(RATE_LIMITS.translation, (remaining, resetTime) => {
      toast({
        title: 'Rate limit exceeded',
        description: `Please wait ${Math.ceil(resetTime / 1000)} seconds before using AI features again.`,
        variant: 'destructive',
      });
    })) {
      return;
    }

    setAiEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-enhance', {
        body: {
          text: pieceForm.text_content,
          action: aiAction,
          language: pieceForm.language,
        },
      });

      if (error) {
        logger.error('AI enhancement error:', error);
        toast({
          title: 'Error',
          description: error.message || 'AI enhancement failed',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error || 'AI enhancement failed',
          variant: 'destructive',
        });
        return;
      }

      if (data?.success && data.result) {
        setPieceForm(f => ({ ...f, text_content: data.result }));
        toast({
          title: 'Success',
          description: getAIActionDescription(aiAction),
        });
        setAiDialogOpen(false);
      }
    } catch (error: any) {
      logger.error('AI enhancement error:', error);
      toast({
        title: 'Error',
        description: error.message || 'AI enhancement failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAiEnhancing(false);
    }
  };

  const getAIActionDescription = (action: string): string => {
    const descriptions: Record<string, string> = {
      improve_recitation: 'Recitation improved with pauses and emphasis',
      add_pronunciation: 'Pronunciation guides added',
      summarize: 'Summary generated',
      explain: 'Explanation generated',
      enhance_reading: 'Reading experience enhanced',
    };
    return descriptions[action] || 'Content enhanced';
  };

  const savePiece = async () => {
    if (!pieceForm.title || !pieceForm.category_id || !pieceForm.text_content) {
      toast({ title: 'Error', description: 'Title, category, and text are required', variant: 'destructive' });
      return;
    }

    // Check permissions for uploaders
    if (role === 'uploader') {
      if (!permissions.categoryIds.includes(pieceForm.category_id)) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to upload to this category.',
          variant: 'destructive',
        });
        return;
      }

      if (pieceForm.imam_id && !permissions.imamIds.includes(pieceForm.imam_id)) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to upload for this Holy Personality.',
          variant: 'destructive',
        });
        return;
      }
    }

    const data = {
      title: pieceForm.title,
      category_id: pieceForm.category_id,
      imam_id: pieceForm.imam_id || null,
      reciter: pieceForm.reciter || null,
      language: pieceForm.language,
      text_content: pieceForm.text_content,
      audio_url: pieceForm.audio_url || null,
      video_url: pieceForm.video_url || null,
      image_url: pieceForm.image_url || null,
    };

    if (isEditing && id) {
      const { error } = await safeQuery(async () =>
        await supabase
          .from('pieces')
          .update(data)
          .eq('id', id)
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to update recitation', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Recitation updated' });
    } else {
      const { error } = await safeQuery(async () =>
        await supabase.from('pieces').insert([data])
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create recitation', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Recitation created' });
    }

    // Navigate back to admin/uploader page
    navigate(role === 'admin' ? '/admin' : '/uploader');
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (role !== 'uploader' && role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 max-w-4xl">
        <Link 
          to={role === 'admin' ? '/admin' : '/uploader'}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {role === 'admin' ? 'Admin' : 'Uploader'} Dashboard
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          {isEditing ? 'Edit Recitation' : 'Add New Recitation'}
        </h1>

        <div className="space-y-6 bg-card p-6 rounded-lg shadow-soft">
          <div>
            <Label htmlFor="piece-title">Title</Label>
            <Input
              id="piece-title"
              value={pieceForm.title}
              onChange={(e) => setPieceForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Ya Nabi Salam Alayka"
              className="mt-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="piece-cat">Category (Type)</Label>
              <Select
                value={pieceForm.category_id}
                onValueChange={(v) => setPieceForm(f => ({ ...f, category_id: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="piece-imam">In Honor Of</Label>
              <Select
                value={pieceForm.imam_id || "none"}
                onValueChange={(v) => setPieceForm(f => ({ ...f, imam_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select Holy Personality" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  <SelectItem value="none">None</SelectItem>
                  {imams.map(imam => (
                    <SelectItem key={imam.id} value={imam.id}>{imam.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="piece-lang">Language</Label>
              <Select
                value={pieceForm.language}
                onValueChange={(v) => setPieceForm(f => ({ ...f, language: v }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                  <SelectItem value="Urdu">Urdu</SelectItem>
                  <SelectItem value="Arabic">Arabic</SelectItem>
                  <SelectItem value="Persian">Persian</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="piece-reciter">Reciter (optional)</Label>
              <Input
                id="piece-reciter"
                value={pieceForm.reciter}
                onChange={(e) => setPieceForm(f => ({ ...f, reciter: e.target.value }))}
                placeholder="e.g., Maher Zain"
                className="mt-2"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Cover Image (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2 mt-1">
              Upload image for image-only recitations or as cover image
            </p>
            <div className="flex items-center gap-4 mt-2">
              {pieceForm.image_url ? (
                <div className="relative group">
                  <img 
                    src={pieceForm.image_url} 
                    alt="Preview" 
                    className="w-32 h-32 rounded-lg object-cover cursor-pointer border-2 border-border hover:border-primary transition-colors"
                    onClick={() => {
                      setImageViewerUrl(pieceForm.image_url);
                      setImageViewerOpen(true);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-8 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageViewerUrl(pieceForm.image_url);
                        setImageViewerOpen(true);
                      }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6"
                    onClick={() => setPieceForm(f => ({ ...f, image_url: '' }))}
                  >
                    <XIcon className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Image
                </Button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="piece-text">Text Content</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFetchDialogOpen(true)}
                  className="gap-2"
                  title="Fetch content from website"
                >
                  <Globe className="w-4 h-4" />
                  Fetch from Website
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAiDialogOpen(true)}
                  disabled={!pieceForm.text_content.trim()}
                  className="gap-2"
                  title="AI enhancements"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Enhance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openBreakPointDialog}
                  className="gap-2"
                  title="Add paragraph/shaair break point with layout style"
                >
                  <Scissors className="w-4 h-4" />
                  Add Break
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateDialogOpen(true)}
                  className="gap-2"
                  title="Apply layout template to break points"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={translateText}
                  disabled={translating || !pieceForm.text_content.trim()}
                  className="gap-2"
                >
                  {translating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Languages className="w-4 h-4" />
                  )}
                  Translate
                </Button>
              </div>
            </div>
            
            {/* Translation Language Selection */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <Label htmlFor="source-lang" className="text-xs">From</Label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger id="source-lang" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hinglish">Hinglish</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                    <SelectItem value="Urdu">Urdu</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Persian">Persian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target-lang" className="text-xs">To</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger id="target-lang" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                    <SelectItem value="Urdu">Urdu</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Persian">Persian</SelectItem>
                    <SelectItem value="Hinglish">Hinglish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Textarea
              id="piece-text"
              value={pieceForm.text_content}
              onChange={(e) => setPieceForm(f => ({ ...f, text_content: e.target.value }))}
              placeholder="Enter text here. Use 'Add Break' button to mark paragraph/shaair endings for better formatting."
              className={`min-h-[300px] font-arabic ${targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'text-right' : 'text-left'}`}
              dir={targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'rtl' : 'ltr'}
            />
            <div className="mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs font-medium text-foreground mb-1">💡 How to use Break Points:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Place your cursor where you want to add a separator line</li>
                <li>Click "Add Break" button above</li>
                <li>Choose the alignment style for text after the break</li>
                <li>A bold horizontal line will appear between sections</li>
                <li>This makes your recitation easier to read and organize</li>
              </ul>
            </div>
          </div>
          
          <div>
            <Label htmlFor="piece-audio">Audio URL (optional)</Label>
            <Input
              id="piece-audio"
              value={pieceForm.audio_url}
              onChange={(e) => setPieceForm(f => ({ ...f, audio_url: e.target.value }))}
              placeholder="https://..."
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="piece-video">Video URL (optional)</Label>
            <Input
              id="piece-video"
              value={pieceForm.video_url}
              onChange={(e) => setPieceForm(f => ({ ...f, video_url: e.target.value }))}
              placeholder="YouTube URL or direct MP4 URL"
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(role === 'admin' ? '/admin' : '/uploader')}
            >
              Cancel
            </Button>
            <Button onClick={savePiece}>
              {isEditing ? 'Update' : 'Create'} Recitation
            </Button>
          </div>
        </div>
      </main>

      {/* Hidden file input */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={onImageSelect}
      />

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          {imageViewerUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/95">
              <img 
                src={imageViewerUrl} 
                alt="Full size preview"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setImageViewerOpen(false)}
              >
                <XIcon className="w-6 h-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fetch from Website Dialog */}
      <Dialog open={fetchDialogOpen} onOpenChange={setFetchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Fetch Content from Website
            </DialogTitle>
            <DialogDescription>
              Enter a website URL to automatically extract and import content. The AI will clean and format it for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="website-url">Website URL</Label>
              <Input
                id="website-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="mt-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !fetchingContent) {
                    fetchFromWebsite();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the full URL of the page containing the content you want to import.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFetchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={fetchFromWebsite} disabled={fetchingContent || !websiteUrl.trim()}>
              {fetchingContent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Fetch Content
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Enhancement Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Enhancement
            </DialogTitle>
            <DialogDescription>
              Use AI to improve recitations, add pronunciation guides, enhance reading experience, and more.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Enhancement</Label>
              <Tabs value={aiAction} onValueChange={(v) => setAiAction(v as any)} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="enhance_reading" className="text-xs">
                    <FileText className="w-4 h-4 mr-1" />
                    Enhance Reading
                  </TabsTrigger>
                  <TabsTrigger value="improve_recitation" className="text-xs">
                    <Mic className="w-4 h-4 mr-1" />
                    Improve Recitation
                  </TabsTrigger>
                  <TabsTrigger value="add_pronunciation" className="text-xs">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Add Pronunciation
                  </TabsTrigger>
                  <TabsTrigger value="explain" className="text-xs">
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Explain
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="enhance_reading" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Improves formatting, adds proper line breaks, and organizes content for better readability.
                  </p>
                </TabsContent>
                <TabsContent value="improve_recitation" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Adds pauses, emphasis markers, and improves flow for better recitation quality.
                  </p>
                </TabsContent>
                <TabsContent value="add_pronunciation" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Adds pronunciation guides in brackets for difficult words, especially Arabic/Urdu terms.
                  </p>
                </TabsContent>
                <TabsContent value="explain" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Provides explanation of meaning, context, and significance of the content.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={enhanceWithAI} disabled={aiEnhancing || !pieceForm.text_content.trim()}>
              {aiEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Enhancement
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Break Point Dialog */}
      <Dialog open={breakPointDialogOpen} onOpenChange={setBreakPointDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              Add Break Point
            </DialogTitle>
            <DialogDescription>
              Add a visual separator line between sections. Choose how the text after this break should be aligned. This helps organize your recitation into clear, readable sections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Layout Style</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <Button
                  type="button"
                  variant={breakPointStyle === 'right' ? 'default' : 'outline'}
                  onClick={() => setBreakPointStyle('right')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="text-right w-full">→</div>
                  <span className="text-xs">Right</span>
                </Button>
                <Button
                  type="button"
                  variant={breakPointStyle === 'left' ? 'default' : 'outline'}
                  onClick={() => setBreakPointStyle('left')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="text-left w-full">←</div>
                  <span className="text-xs">Left</span>
                </Button>
                <Button
                  type="button"
                  variant={breakPointStyle === 'center' ? 'default' : 'outline'}
                  onClick={() => setBreakPointStyle('center')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="text-center w-full">↔</div>
                  <span className="text-xs">Center</span>
                </Button>
                <Button
                  type="button"
                  variant={breakPointStyle === 'indent' ? 'default' : 'outline'}
                  onClick={() => setBreakPointStyle('indent')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <div className="text-center w-full pr-4">↔</div>
                  <span className="text-xs">Indent</span>
                </Button>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-medium mb-2">What this does:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {breakPointStyle === 'right' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Creates a bold horizontal line separator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Text after break will be right-aligned (standard for Urdu/Arabic)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Perfect for organizing verses and couplets</span>
                      </li>
                    </>
                  )}
                  {breakPointStyle === 'left' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Creates a bold horizontal line separator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Text after break will be left-aligned</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Useful for English text or mixed content</span>
                      </li>
                    </>
                  )}
                  {breakPointStyle === 'center' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Creates a bold horizontal line separator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Text after break will be centered</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Great for emphasis or special sections</span>
                      </li>
                    </>
                  )}
                  {breakPointStyle === 'indent' && (
                    <>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Creates a bold horizontal line separator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Text after break will be indented from right</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>✓</span>
                        <span>Perfect for concluding verses or special emphasis</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setBreakPointDialogOpen(false);
              breakPointCursorPos.current = null;
            }}>
              Cancel
            </Button>
            <Button onClick={() => addBreakPoint(breakPointStyle)}>
              <Scissors className="w-4 h-4 mr-2" />
              Add Break Point
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              Apply Layout Template
            </DialogTitle>
            <DialogDescription>
              Select a template to automatically apply layout styles. If you have break points, it will style them. If not, it will add break points between paragraphs automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Choose Template Pattern</Label>
              <div className="grid grid-cols-1 gap-3 mt-3">
                {Object.entries(templates).map(([key, template]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={selectedTemplate === key ? 'default' : 'outline'}
                    onClick={() => setSelectedTemplate(key)}
                    className="flex flex-col items-start gap-2 h-auto py-4 px-4 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{template.name}</span>
                      <div className="flex gap-1">
                        {template.pattern.map((style, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded ${
                              style === 'center' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              style === 'left' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                              style === 'indent' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {style === 'center' ? 'C' : style === 'left' ? 'L' : style === 'indent' ? 'I' : 'R'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedTemplate && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>If you have break points: Applies the template pattern to style them</li>
                  <li>If no break points: Automatically adds break points between paragraphs</li>
                  <li>Pattern applies starting from the first break point</li>
                  <li>Pattern repeats if you have more sections than the template length</li>
                  <li>Each section gets the corresponding style (Center, Right, Left, or Indent)</li>
                </ul>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setTemplateDialogOpen(false);
              setSelectedTemplate(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={applyTemplate} 
              disabled={!selectedTemplate}
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Apply Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

