import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, Loader2, ChevronLeft, Upload, Languages, Scissors, Maximize2, X as XIcon } from 'lucide-react';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getKarbalaPlaceholder } from '@/lib/utils';
import type { Category, Piece, Imam } from '@/lib/supabase-types';
import { ReciterCombobox } from '@/components/ReciterCombobox';

export default function UploaderPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [permissions, setPermissions] = useState<{ categoryIds: string[]; imamIds: string[] }>({ categoryIds: [], imamIds: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('Hinglish');
  const [targetLanguage, setTargetLanguage] = useState('Kashmiri');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Piece Dialog
  const [pieceDialogOpen, setPieceDialogOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<Piece | null>(null);
  const [pieceForm, setPieceForm] = useState({
    title: '',
    category_id: '',
    imam_id: '',
    reciter: '',
    language: 'Urdu',
    text_content: '',
    video_url: '',
    image_url: '',
  });

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UploaderPage.tsx:63',message:'checkAuth effect triggered',data:{role,roleLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    checkAuth();
  }, [role, roleLoading]);

  useEffect(() => {
    if (role === 'uploader' || role === 'admin') {
      fetchData();
    }
  }, [role]);

  const checkAuth = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UploaderPage.tsx:73',message:'checkAuth called',data:{role,roleLoading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (roleLoading) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UploaderPage.tsx:75',message:'role still loading, waiting',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    if (role !== 'uploader' && role !== 'admin') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UploaderPage.tsx:82',message:'redirecting to home - not uploader/admin',data:{role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      toast({
        title: 'Access Denied',
        description: 'You need uploader permissions to access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch user permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        logger.error('Error getting user:', userError);
        toast({ title: 'Error', description: 'Failed to authenticate', variant: 'destructive' });
        setLoading(false);
        return;
      }
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: perms, error: permsError } = await safeQuery(async () =>
        await (supabase as any)
          .from('uploader_permissions')
          .select('category_id, imam_id')
          .eq('user_id', user.id)
      );

      if (permsError) {
        logger.error('Error fetching permissions:', permsError);
      }

      const categoryIds = perms?.filter(p => p.category_id).map(p => p.category_id!) || [];
      const imamIds = perms?.filter(p => p.imam_id).map(p => p.imam_id!) || [];

      setPermissions({ categoryIds, imamIds });

      // Fetch categories and figures user has permission for
      const [catRes, figureRes, pieceRes] = await Promise.all([
        safeQuery(async () =>
          await (role === 'admin' 
            ? supabase.from('categories').select('*').order('name')
            : supabase.from('categories').select('*').in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']).order('name'))
        ),
        safeQuery(async () =>
          await (role === 'admin'
            ? supabase.from('imams').select('*').order('order_index, name')
            : supabase.from('imams').select('*').in('id', imamIds.length > 0 ? imamIds : ['00000000-0000-0000-0000-000000000000']).order('order_index, name'))
        ),
        safeQuery(async () => await supabase.from('pieces').select('*').order('created_at', { ascending: false })),
      ]);

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
        toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' });
      } else if (catRes.data) {
        setCategories(catRes.data as Category[]);
      }

      if (figureRes.error) {
        logger.error('Error fetching imams:', figureRes.error);
        toast({ title: 'Error', description: 'Failed to load Ahlulbayt', variant: 'destructive' });
      } else if (figureRes.data) {
        setImams(figureRes.data as Imam[]);
      }

      if (pieceRes.error) {
        logger.error('Error fetching pieces:', pieceRes.error);
        toast({ title: 'Error', description: 'Failed to load recitations', variant: 'destructive' });
      } else if (pieceRes.data) {
        // Filter pieces to only show those user can access
        const accessiblePieces = (pieceRes.data as Piece[]).filter(piece => {
          if (role === 'admin') return true;
          return categoryIds.includes(piece.category_id) && 
                 (piece.imam_id === null || imamIds.includes(piece.imam_id));
        });
        setPieces(accessiblePieces);
      }
    } catch (error) {
      logger.error('Unexpected error in fetchData:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
      
      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
      
      if (error) {
        logger.error('Image upload error:', error);
        
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
  const addBreakPoint = () => {
    const textarea = document.getElementById('piece-text') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = pieceForm.text_content;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);
    
    const newText = beforeText + '\n\n||BREAK||\n\n' + afterText;
    setPieceForm(f => ({ ...f, text_content: newText }));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 12, start + 12);
    }, 0);
    
    toast({ title: 'Break point added', description: 'Paragraph break marker inserted' });
  };

  // Translate function
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

      if (error) {
        logger.error('Translation function error:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('CORS') || error.message?.includes('Failed to send')) {
          toast({ 
            title: 'Translation Error', 
            description: 'Translation service is unavailable. Please try again later or contact support.', 
            variant: 'destructive' 
          });
        } else {
          throw error;
        }
        return;
      }
      
      if (data?.error) {
        logger.error('Translation API error:', data.error);
        toast({ 
          title: 'Translation Error', 
          description: data.error || 'Translation failed', 
          variant: 'destructive' 
        });
        return;
      }

      if (data?.translatedText) {
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

  // Piece functions
  const openPieceDialog = (piece?: Piece) => {
    // Check if user has permission for this piece
    if (piece && role !== 'admin') {
      const hasCategoryPerm = permissions.categoryIds.includes(piece.category_id);
      const hasImamPerm = !piece.imam_id || permissions.imamIds.includes(piece.imam_id);
      
      if (!hasCategoryPerm || !hasImamPerm) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to edit this recitation.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (piece) {
      setEditingPiece(piece);
      setPieceForm({
        title: piece.title,
        category_id: piece.category_id,
        figure_id: piece.figure_id || '',
        reciter: piece.reciter || '',
        language: piece.language,
        text_content: piece.text_content,
        video_url: piece.video_url || '',
        image_url: piece.image_url || '',
      });
    } else {
      setEditingPiece(null);
      setPieceForm({
        title: '',
        category_id: categories[0]?.id || '',
        imam_id: '',
        reciter: '',
        language: 'Kashmiri',
        text_content: '',
        video_url: '',
        image_url: '',
      });
    }
    setPieceDialogOpen(true);
  };

  const savePiece = async () => {
    if (!pieceForm.title || !pieceForm.category_id || !pieceForm.text_content) {
      toast({ title: 'Error', description: 'Title, category, and text are required', variant: 'destructive' });
      return;
    }

    // Check permissions
    if (role !== 'admin') {
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
      video_url: pieceForm.video_url || null,
      image_url: pieceForm.image_url || null,
    };

    if (editingPiece) {
      const { error } = await safeQuery(async () =>
        await supabase
          .from('pieces')
          .update(data)
          .eq('id', editingPiece.id)
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

    setPieceDialogOpen(false);
    fetchData();
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
      
      <main className="container py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Uploader Dashboard</h1>

        {categories.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              You don't have permission to upload to any categories yet. Please contact an admin to grant you permissions.
            </p>
          </div>
        )}

        <Tabs defaultValue="pieces" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="pieces" className="gap-2">
              <FileText className="w-4 h-4" />
              Recitations ({pieces.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pieces" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={() => navigate('/uploader/piece/new')} 
                disabled={categories.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Recitation
              </Button>
            </div>

            <div className="grid gap-3">
              {pieces.map((piece) => {
                const category = categories.find(c => c.id === piece.category_id);
                const imam = imams.find(f => f.id === piece.imam_id);
                return (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg shadow-soft"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <img 
                        src={piece.image_url || getKarbalaPlaceholder(piece.id)} 
                        alt={piece.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getKarbalaPlaceholder(piece.id);
                        }}
                      />
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{piece.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/uploader/piece/${piece.id}/edit`)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pieces.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No recitations yet. Add your first recitation!
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Hidden file input */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*"
        onChange={onImageSelect}
      />

      {/* Piece Dialog */}
      <Dialog open={pieceDialogOpen} onOpenChange={setPieceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPiece ? 'Edit Piece' : 'Add New Recitation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="piece-title">Title</Label>
              <Input
                id="piece-title"
                value={pieceForm.title}
                onChange={(e) => setPieceForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Ya Nabi Salam Alayka"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="piece-cat">Category (Type)</Label>
                <Select
                  value={pieceForm.category_id}
                  onValueChange={(v) => setPieceForm(f => ({ ...f, category_id: v }))}
                >
                  <SelectTrigger>
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
                  value={pieceForm.imam_id}
                  onValueChange={(v) => setPieceForm(f => ({ ...f, imam_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Holy Personality" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border">
                    <SelectItem value="">None</SelectItem>
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
                  <SelectTrigger>
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
                <ReciterCombobox
                  id="piece-reciter"
                  value={pieceForm.reciter}
                  onChange={(value) => setPieceForm(f => ({ ...f, reciter: value }))}
                  placeholder="e.g., Maher Zain"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <Label>Cover Image (optional)</Label>
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBreakPoint}
                    className="gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    Add Break
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
                className={`min-h-[250px] font-arabic ${targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'text-right' : 'text-left'}`}
                dir={targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'rtl' : 'ltr'}
              />
            </div>
            
            <div>
              <Label htmlFor="piece-video">Video URL (optional)</Label>
              <Input
                id="piece-video"
                value={pieceForm.video_url}
                onChange={(e) => setPieceForm(f => ({ ...f, video_url: e.target.value }))}
                placeholder="YouTube URL or direct MP4 URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPieceDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePiece}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

