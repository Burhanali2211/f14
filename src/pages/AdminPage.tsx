import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FolderOpen, FileText, Loader2, ChevronLeft, Upload, Image as ImageIcon, Users, Languages, Maximize2, ZoomIn, ZoomOut, X as XIcon, Scissors, UserCog, Shield, Key, Settings, Mic, Calendar, Bell, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getKarbalaPlaceholder } from '@/lib/utils';
import type { Category, Piece, Imam, UserProfile, UploaderPermission, SiteSettings, Artiste, AhlulBaitEvent, EventType } from '@/lib/supabase-types';
import { optimizeArtistImage, optimizeRecitationImage, validateImageFile, formatFileSize } from '@/lib/image-optimizer';
import { ReciterCombobox } from '@/components/ReciterCombobox';

export default function AdminPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading, user: currentUser, refresh: refreshRole } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [artistes, setArtistes] = useState<Artiste[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<AhlulBaitEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('Hinglish');
  const [targetLanguage, setTargetLanguage] = useState('Kashmiri');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  // User Management
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({ 
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    address: '',
    role: 'user' as 'admin' | 'uploader' | 'user' 
  });
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPermissions, setUserPermissions] = useState<UploaderPermission[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedImams, setSelectedImams] = useState<string[]>([]);


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

  // Imam Dialog
  const [imamDialogOpen, setImamDialogOpen] = useState(false);
  const [editingImam, setEditingImam] = useState<Imam | null>(null);
  const [imamForm, setImamForm] = useState({ name: '', slug: '', description: '', title: '', order_index: 1 });

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'category' | 'piece' | 'imam' | 'event'; id: string } | null>(null);

  // Event Dialog
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AhlulBaitEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    event_name: '',
    event_date: '',
    hijri_date: '',
    event_type: 'other' as EventType,
    imam_id: '',
    description: '',
    is_annual: true,
  });

  // Artiste Image Upload Dialog
  const [artisteImageDialogOpen, setArtisteImageDialogOpen] = useState(false);
  const [selectedArtiste, setSelectedArtiste] = useState<Artiste | null>(null);
  const [artisteImageFile, setArtisteImageFile] = useState<File | null>(null);
  const [artisteImagePreview, setArtisteImagePreview] = useState<string | null>(null);
  const [uploadingArtisteImage, setUploadingArtisteImage] = useState(false);
  const artisteImageInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    // Simple guard: wait for role to resolve, then gate access
    if (roleLoading) return;

    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'Please log in as an admin to access the admin panel.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (currentRole !== 'admin') {
      toast({
        title: 'Access denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setUser(currentUser);
    fetchData();
  }, [currentUser, currentRole, roleLoading]);

  const fetchData = async () => {
    try {
      const [catRes, pieceRes, imamRes, artistesRes, usersRes, eventsRes] = await Promise.all([
        safeQuery(async () => await supabase.from('categories').select('*').order('name')),
        safeQuery(async () => await supabase.from('pieces').select('*').order('created_at', { ascending: false })),
        safeQuery(async () => {
          const { data, error } = await (supabase as any).from('imams').select('*');
          if (error) return { data: null, error };
          // Sort by order_index first, then by name (treat 0 or null as 1)
          const sorted = (data || []).sort((a: Imam, b: Imam) => {
            const orderA = a.order_index || 1;
            const orderB = b.order_index || 1;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '');
          });
          return { data: sorted, error: null };
        }),
        safeQuery(async () => await (supabase as any).from('artistes').select('*').order('name')),
        safeQuery(async () => await (supabase as any).from('users').select('id, email, full_name, phone_number, address, role, is_active, created_at, updated_at').order('created_at', { ascending: false })),
        safeQuery(async () => await (supabase as any).from('ahlul_bait_events').select('*, imam:imams(*)').order('event_date', { ascending: true })),
      ]);

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
        toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' });
      } else if (catRes.data) {
        setCategories(catRes.data as Category[]);
      }

      if (pieceRes.error) {
        logger.error('Error fetching pieces:', pieceRes.error);
        toast({ title: 'Error', description: 'Failed to load recitations', variant: 'destructive' });
      } else if (pieceRes.data) {
        setPieces(pieceRes.data as Piece[]);
      }

      if (imamRes.error) {
        logger.error('Error fetching imams:', imamRes.error);
        toast({ title: 'Error', description: 'Failed to load Ahlulbayt', variant: 'destructive' });
      } else if (imamRes.data) {
        setImams(imamRes.data as Imam[]);
      }

      if (artistesRes.error) {
        logger.error('Error fetching artistes:', artistesRes.error);
        // Only show error toast if it's a critical error, not just empty result
        if (artistesRes.error.message && !artistesRes.error.message.includes('permission') && !artistesRes.error.message.includes('relation') && !artistesRes.error.message.includes('does not exist')) {
          toast({ title: 'Error', description: 'Failed to load artistes', variant: 'destructive' });
        }
      } else if (artistesRes.data) {
        setArtistes(artistesRes.data as unknown as Artiste[]);
      } else {
        // No error and no data means empty result, which is fine
        setArtistes([]);
      }

      if (usersRes.error) {
        logger.error('Error fetching users:', usersRes.error);
        toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
      } else if (usersRes.data) {
        setUserProfiles(usersRes.data as UserProfile[]);
      }


      if (eventsRes.error) {
        logger.error('Error fetching events:', eventsRes.error);
        toast({ title: 'Error', description: 'Failed to load events', variant: 'destructive' });
      } else if (eventsRes.data) {
        setEvents(eventsRes.data as unknown as AhlulBaitEvent[]);
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
      logger.debug('Optimizing piece image for high quality', {
        originalSize: formatFileSize(file.size),
        fileName: file.name,
      });

      // Optimize image for pieces - high quality, clear, no blur
      const optimizedBlob = await optimizeRecitationImage(file);
      logger.debug('Piece image optimized', {
        optimizedSize: formatFileSize(optimizedBlob.size),
        reduction: `${Math.round((1 - optimizedBlob.size / file.size) * 100)}%`,
      });

      const fileName = `piece-${Date.now()}.webp`;
      
      logger.debug('Uploading optimized piece image:', { fileName, size: optimizedBlob.size });
      
      // Upload optimized image with WebP format
      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: 'image/webp',
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
    
    // Insert break marker at cursor position
    const newText = beforeText + '\n\n||BREAK||\n\n' + afterText;
    setPieceForm(f => ({ ...f, text_content: newText }));
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 12, start + 12);
    }, 0);
    
    toast({ title: 'Break point added', description: 'Paragraph break marker inserted' });
  };

  // Translate function with language support
  const translateText = async () => {
    if (!pieceForm.text_content.trim()) {
      toast({ title: 'Error', description: 'Enter text to translate', variant: 'destructive' });
      return;
    }

    // Check rate limit
    if (!checkRateLimit(RATE_LIMITS.translation, (remaining, resetTime) => {
      toast({
        title: 'Translation rate limit',
        description: `Please wait ${Math.ceil(resetTime / 1000)} seconds before translating again.`,
        variant: 'destructive',
      });
    })) {
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

  // Category functions
  const openCategoryForm = (category?: Category) => {
    if (category) {
      navigate(`/admin/category/${category.id}/edit`);
    } else {
      navigate('/admin/category/new');
    }
  };


  // Imam functions
  const openImamDialog = (imam?: Imam) => {
    if (imam) {
      setEditingImam(imam);
      setImamForm({
        name: imam.name,
        slug: imam.slug,
        description: imam.description || '',
        title: imam.title || '',
        order_index: imam.order_index || 1,
      });
    } else {
      // For new imam, set order_index to max + 1 (starting from 1)
      const maxOrder = imams.length > 0 
        ? Math.max(...imams.map(i => i.order_index || 0), 0) 
        : 0;
      setEditingImam(null);
      setImamForm({ name: '', slug: '', description: '', title: '', order_index: Math.max(maxOrder + 1, 1) });
    }
    setImamDialogOpen(true);
  };

  const saveImam = async () => {
    if (!imamForm.name || !imamForm.slug) {
      toast({ title: 'Error', description: 'Name and slug are required', variant: 'destructive' });
      return;
    }

    const data = {
      name: imamForm.name,
      slug: imamForm.slug.toLowerCase().replace(/\s+/g, '-'),
      description: imamForm.description || null,
      title: imamForm.title || null,
      order_index: Math.max(Number(imamForm.order_index) || 1, 1),
    };

    if (editingImam) {
      const { error } = await authenticatedQuery(async () =>
        await (supabase as any)
          .from('imams')
          .update(data)
          .eq('id', editingImam.id)
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to update. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Holy Personality updated' });
    } else {
      const { error } = await authenticatedQuery(async () =>
        await (supabase as any).from('imams').insert([data])
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Holy Personality created' });
    }

    setImamDialogOpen(false);
    fetchData();
  };

  // Piece functions
  const openPieceDialog = (piece?: Piece) => {
    if (piece) {
      setEditingPiece(piece);
      setPieceForm({
        title: piece.title,
        category_id: piece.category_id,
        imam_id: piece.imam_id || '',
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
      const { error } = await authenticatedQuery(async () =>
        await supabase
          .from('pieces')
          .update(data)
          .eq('id', editingPiece.id)
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to update recitation. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Recitation updated' });
    } else {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('pieces').insert([data])
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create recitation. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Recitation created' });
    }

    setPieceDialogOpen(false);
    fetchData();
  };

  // Artiste Image Upload Functions
  const openArtisteImageDialog = (artiste: Artiste) => {
    setSelectedArtiste(artiste);
    setArtisteImageFile(null);
    setArtisteImagePreview(artiste.image_url);
    setArtisteImageDialogOpen(true);
  };

  const handleArtisteImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Error',
        description: validation.error || 'Invalid image file',
        variant: 'destructive',
      });
      return;
    }

    setArtisteImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setArtisteImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadArtisteImage = async () => {
    if (!selectedArtiste || !artisteImageFile) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setUploadingArtisteImage(true);
    try {
      // Optimize the image for small size
      logger.debug('Optimizing artist image', {
        originalSize: formatFileSize(artisteImageFile.size),
        fileName: artisteImageFile.name,
      });

      const optimizedBlob = await optimizeArtistImage(artisteImageFile);
      logger.debug('Image optimized', {
        optimizedSize: formatFileSize(optimizedBlob.size),
        reduction: `${Math.round((1 - optimizedBlob.size / artisteImageFile.size) * 100)}%`,
      });

      // Create optimized file name
      const fileName = `${selectedArtiste.slug}-${Date.now()}.webp`;

      // Upload optimized image to storage
      const { data, error } = await supabase.storage
        .from('artist-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) {
        logger.error('Artiste image upload error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to upload image',
          variant: 'destructive',
        });
        return;
      }

      if (!data?.path) {
        logger.error('Upload succeeded but no path returned');
        toast({
          title: 'Error',
          description: 'Upload succeeded but failed to get image URL',
          variant: 'destructive',
        });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('artist-images')
        .getPublicUrl(data.path);

      // Update artiste record with image URL
      const { error: updateError } = await safeQuery(async () =>
        await (supabase as any)
          .from('artistes')
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', selectedArtiste.id)
      );

      if (updateError) {
        logger.error('Error updating artiste image URL:', updateError);
        toast({
          title: 'Error',
          description: 'Image uploaded but failed to update artiste record',
          variant: 'destructive',
        });
        return;
      }

      logger.debug('Artiste image uploaded successfully:', publicUrl);
      toast({
        title: 'Success',
        description: `Image uploaded for ${selectedArtiste.name}`,
      });

      setArtisteImageDialogOpen(false);
      fetchData();
    } catch (error: any) {
      logger.error('Unexpected error during artiste image upload:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploadingArtisteImage(false);
    }
  };

  // Delete function
  const handleDelete = async () => {
    if (!deleteDialog) return;

    const tableMap: Record<string, string> = {
      category: 'categories',
      piece: 'pieces',
      imam: 'imams',
      event: 'ahlul_bait_events',
    };
    const table = tableMap[deleteDialog.type] || 'categories';
    
    const { error } = await authenticatedQuery(async () =>
      await (supabase as any).from(table).delete().eq('id', deleteDialog.id)
    );

    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete. Please refresh the page and try again.', 
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Success', description: `${deleteDialog.type} deleted` });
      fetchData();
    }

    setDeleteDialog(null);
  };

  // User Management Functions
  const openUserDialog = (userProfile?: UserProfile) => {
    if (userProfile) {
      setEditingUser(userProfile);
      setIsAddingUser(false);
      setUserForm({ 
        email: userProfile.email || '',
        password: '',
        full_name: userProfile.full_name || '',
        phone_number: '',
        address: '',
        role: userProfile.role 
      });
    } else {
      setEditingUser(null);
      setIsAddingUser(true);
      setUserForm({ 
        email: '',
        password: '',
        full_name: '',
        phone_number: '',
        address: '',
        role: 'user' 
      });
    }
    setUserDialogOpen(true);
  };

  // Hash password using SHA-256 (same as auth function)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const saveUser = async () => {
    if (isAddingUser) {
      // Create new user
      if (!userForm.email || !userForm.password) {
        toast({ 
          title: 'Error', 
          description: 'Email and password are required', 
          variant: 'destructive' 
        });
        return;
      }

      if (userForm.password.length < 6) {
        toast({ 
          title: 'Error', 
          description: 'Password must be at least 6 characters', 
          variant: 'destructive' 
        });
        return;
      }

      try {
        logger.debug('Admin: Creating new user', { email: userForm.email, role: userForm.role });
        
        const passwordHash = await hashPassword(userForm.password);

        const { data: newUser, error } = await authenticatedQuery(async () => {
          return await (supabase as any)
            .from('users')
            .insert({
              email: userForm.email,
              password_hash: passwordHash,
              full_name: userForm.full_name || null,
              phone_number: userForm.phone_number || null,
              address: userForm.address || null,
              role: userForm.role,
              is_active: true,
            })
            .select('id, email, full_name, phone_number, address, role, is_active, created_at, updated_at')
            .single();
        });

        if (error) {
          logger.error('Admin: Error creating user:', error);
          if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
            toast({ 
              title: 'Error', 
              description: 'Email already exists', 
              variant: 'destructive' 
            });
          } else {
            toast({ 
              title: 'Error', 
              description: error.message || 'Failed to create user', 
              variant: 'destructive' 
            });
          }
          return;
        }

        toast({ title: 'Success', description: 'User created successfully' });
        setUserDialogOpen(false);
        fetchData();
      } catch (error: any) {
        logger.error('Admin: Unexpected error creating user:', error);
        toast({ 
          title: 'Error', 
          description: error.message || 'Failed to create user', 
          variant: 'destructive' 
        });
      }
    } else {
      // Update existing user
      if (!editingUser) {
        toast({ title: 'Error', description: 'No user selected', variant: 'destructive' });
        return;
      }

      logger.debug('Admin: Updating user', { userId: editingUser.id, newRole: userForm.role });

      const updateData: any = {
        role: userForm.role,
        full_name: userForm.full_name || null,
        phone_number: userForm.phone_number || null,
        address: userForm.address || null,
        updated_at: new Date().toISOString(),
      };

      // Only update password if provided
      if (userForm.password && userForm.password.length > 0) {
        if (userForm.password.length < 6) {
          toast({ 
            title: 'Error', 
            description: 'Password must be at least 6 characters', 
            variant: 'destructive' 
          });
          return;
        }
        updateData.password_hash = await hashPassword(userForm.password);
      }

      const { error } = await authenticatedQuery(async () =>
        await (supabase as any)
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id)
      );

      if (error) {
        logger.error('Admin: Error updating user:', error);
        toast({ title: 'Error', description: error.message || 'Failed to update user', variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: 'User updated successfully' });
      setUserDialogOpen(false);
      fetchData();
    }
  };

  const openPermissionDialog = async (userProfile: UserProfile) => {
    if (userProfile.role !== 'uploader') {
      toast({
        title: 'Error',
        description: 'Only uploaders can have permissions assigned',
        variant: 'destructive',
      });
      return;
    }

    setSelectedUser(userProfile);
    
    // Fetch existing permissions
    const { data: perms } = await supabase
      .from('uploader_permissions')
      .select('*')
      .eq('user_id', userProfile.id);

    if (perms) {
      setUserPermissions(perms as UploaderPermission[]);
      setSelectedCategories(perms.filter(p => p.category_id).map(p => p.category_id!));
      setSelectedImams(perms.filter(p => p.imam_id).map(p => p.imam_id!));
    } else {
      setSelectedCategories([]);
      setSelectedImams([]);
    }

    setPermissionDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    // Delete existing permissions
    const { error: deleteError } = await authenticatedQuery(async () =>
      await supabase
        .from('uploader_permissions')
        .delete()
        .eq('user_id', selectedUser.id)
    );

    if (deleteError) {
      toast({ 
        title: 'Error', 
        description: deleteError.message || 'Failed to update permissions. Please refresh the page and try again.', 
        variant: 'destructive' 
      });
      return;
    }

    // Create new permissions
    const newPermissions: { user_id: string; category_id?: string; imam_id?: string }[] = [];
    
    selectedCategories.forEach(catId => {
      newPermissions.push({ user_id: selectedUser.id, category_id: catId });
    });

    selectedImams.forEach(imamId => {
      newPermissions.push({ user_id: selectedUser.id, imam_id: imamId });
    });

    if (newPermissions.length > 0) {
      const { error } = await authenticatedQuery(async () =>
        await supabase
          .from('uploader_permissions')
          .insert(newPermissions)
      );

      if (error) {
        toast({ 
          title: 'Error', 
          description: error.message || 'Failed to save permissions. Please refresh the page and try again.', 
          variant: 'destructive' 
        });
        return;
      }
    }

    toast({ title: 'Success', description: 'Permissions updated' });
    setPermissionDialogOpen(false);
    fetchData();
  };

  // Event functions
  const openEventDialog = (event?: AhlulBaitEvent) => {
    if (event) {
      setEditingEvent(event);
      // Extract Hijri date from description if it exists
      const hijriMatch = event.description?.match(/Hijri:\s*(.+?)(?:\n|$)/i);
      const hijriDate = hijriMatch ? hijriMatch[1].trim() : '';
      
      // Remove Hijri date from description for editing
      let cleanDescription = event.description || '';
      if (hijriMatch) {
        cleanDescription = cleanDescription.replace(/Hijri:\s*.+?(?:\n|$)/i, '').trim();
      }
      
      setEventForm({
        event_name: event.event_name,
        event_date: event.event_date,
        hijri_date: hijriDate,
        event_type: event.event_type,
        imam_id: event.imam_id,
        description: cleanDescription,
        is_annual: event.is_annual,
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        event_name: '',
        event_date: '',
        hijri_date: '',
        event_type: 'other',
        imam_id: imams[0]?.id || '',
        description: '',
        is_annual: true,
      });
    }
    setEventDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!eventForm.event_name || !eventForm.event_date) {
      toast({ title: 'Error', description: 'Event name and date are required', variant: 'destructive' });
      return;
    }

    // Build description with Hijri date if provided
    let description = eventForm.description?.trim() || '';
    if (eventForm.hijri_date) {
      const hijriText = `Hijri: ${eventForm.hijri_date.trim()}`;
      if (description) {
        description = `${description}\n${hijriText}`;
      } else {
        description = hijriText;
      }
    }

    const data = {
      event_name: eventForm.event_name,
      event_date: eventForm.event_date,
      event_type: eventForm.event_type,
      imam_id: eventForm.imam_id || imams[0]?.id || '00000000-0000-0000-0000-000000000000',
      description: description || null,
      is_annual: eventForm.is_annual,
    };

    if (editingEvent) {
      const { error } = await authenticatedQuery(async () =>
        await (supabase as any)
          .from('ahlul_bait_events')
          .update(data)
          .eq('id', editingEvent.id)
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to update. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Event updated' });
    } else {
      const { error } = await authenticatedQuery(async () =>
        await (supabase as any).from('ahlul_bait_events').insert([data])
      );

      if (error) {
        toast({ title: 'Error', description: error.message || 'Failed to create. Please refresh the page and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Success', description: 'Event created' });
    }

    setEventDialogOpen(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 sm:py-6 md:py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6 md:mb-8">Admin Panel</h1>

        <Tabs defaultValue="pieces" className="space-y-6">
          <div className="-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            {/* Mobile: Horizontal scrollable tabs with native scrolling */}
            <div 
              className="block sm:hidden overflow-x-auto -mx-3 px-3 scroll-smooth" 
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <style>{`
                .overflow-x-auto::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <TabsList className="bg-card w-max flex gap-2.5 h-auto py-3 px-2">
                <TabsTrigger value="pieces" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>Recitations</span>
                  <span className="text-muted-foreground"> ({pieces.length})</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span>Categories</span>
                  <span className="text-muted-foreground"> ({categories.length})</span>
                </TabsTrigger>
                <TabsTrigger value="imams" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Ahlulbayt</span>
                  <span className="text-muted-foreground"> ({imams.length})</span>
                </TabsTrigger>
                <TabsTrigger value="artistes" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <Mic className="w-4 h-4 flex-shrink-0" />
                  <span>Artistes</span>
                  <span className="text-muted-foreground"> ({artistes.length})</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Events</span>
                  <span className="text-muted-foreground"> ({events.length})</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 flex-shrink-0 min-h-[44px] touch-manipulation">
                  <UserCog className="w-4 h-4 flex-shrink-0" />
                  <span>Users</span>
                  <span className="text-muted-foreground"> ({userProfiles.length})</span>
                </TabsTrigger>
                <Link to="/admin/announcements" className="flex-shrink-0">
                  <Button variant="ghost" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 min-h-[44px] touch-manipulation">
                    <Bell className="w-4 h-4 flex-shrink-0" />
                    <span>Announcements</span>
                  </Button>
                </Link>
                <Link to="/admin/site-settings" className="flex-shrink-0">
                  <Button variant="ghost" className="gap-2 px-4 py-2.5 text-sm whitespace-nowrap h-11 min-h-[44px] touch-manipulation">
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span>Settings</span>
                  </Button>
                </Link>
              </TabsList>
            </div>
            {/* Desktop: Normal tabs with wrap */}
            <TabsList className="hidden sm:flex bg-card w-full flex flex-wrap gap-2 h-auto py-3 justify-start">
              <TabsTrigger value="pieces" className="gap-2 px-4 text-sm whitespace-nowrap">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span>Recitations</span>
                <span className="hidden md:inline"> ({pieces.length})</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2 px-4 text-sm whitespace-nowrap">
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span>Categories</span>
                <span className="hidden md:inline"> ({categories.length})</span>
              </TabsTrigger>
              <TabsTrigger value="imams" className="gap-2 px-4 text-sm whitespace-nowrap">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>Ahlulbayt</span>
                <span className="hidden md:inline"> ({imams.length})</span>
              </TabsTrigger>
              <TabsTrigger value="artistes" className="gap-2 px-4 text-sm whitespace-nowrap">
                <Mic className="w-4 h-4 flex-shrink-0" />
                <span>Artistes</span>
                <span className="hidden md:inline"> ({artistes.length})</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2 px-4 text-sm whitespace-nowrap">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Events</span>
                <span className="hidden md:inline"> ({events.length})</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 px-4 text-sm whitespace-nowrap">
                <UserCog className="w-4 h-4 flex-shrink-0" />
                <span>Users</span>
                <span className="hidden md:inline"> ({userProfiles.length})</span>
              </TabsTrigger>
              <Link to="/admin/announcements">
                <Button variant="ghost" className="gap-2 px-4 text-sm whitespace-nowrap h-10">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Announcements</span>
                  <span className="sm:hidden">Announce</span>
                </Button>
              </Link>
              <Link to="/admin/site-settings">
                <Button variant="ghost" className="gap-2 px-4 text-sm whitespace-nowrap h-10">
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Site Settings</span>
                  <span className="sm:hidden">Settings</span>
                </Button>
              </Link>
            </TabsList>
          </div>

          {/* Recitations Tab */}
          <TabsContent value="pieces" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => navigate('/admin/piece/new')} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Recitation</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <div className="grid gap-3">
              {pieces.map((piece) => {
                const category = categories.find(c => c.id === piece.category_id);
                const imam = imams.find(f => f.id === piece.imam_id);
                return (
                  <div
                    key={piece.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <img 
                        src={piece.image_url || getKarbalaPlaceholder(piece.id)} 
                        alt={piece.title}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getKarbalaPlaceholder(piece.id);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{piece.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                          {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 sm:ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/piece/${piece.id}/edit`)}
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ type: 'piece', id: piece.id })}
                        className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openCategoryForm()} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Category</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <div className="grid gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{category.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">/{category.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openCategoryForm(category)}
                      className="h-9 w-9 sm:h-10 sm:w-10"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ type: 'category', id: category.id })}
                      className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Ahlulbayt Tab */}
          <TabsContent value="imams" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openImamDialog()} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Holy Personality</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <div className="grid gap-3">
              {imams.map((imam) => (
                <div
                  key={imam.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">{imam.order_index || 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{imam.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{imam.description || imam.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openImamDialog(imam)}
                      className="h-9 w-9 sm:h-10 sm:w-10"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ type: 'imam', id: imam.id })}
                      className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {imams.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No Holy Personalities yet. Add your first one!
                </div>
              )}
            </div>
          </TabsContent>

          {/* Artistes Tab */}
          <TabsContent value="artistes" className="space-y-4">
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                Upload optimized images for artistes. Images are automatically resized to 200x200px and compressed for optimal performance. 
                <span className="block mt-1 text-xs text-muted-foreground/80">
                  Note: Artistes cannot be deleted as they are linked to recitations. You can only manage their profile images.
                </span>
              </p>
            </div>

            <div className="grid gap-3">
              {artistes.map((artiste) => (
                <div
                  key={artiste.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {artiste.image_url ? (
                      <img
                        src={artiste.image_url}
                        alt={artiste.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0 border-2 border-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border-2 border-dashed border-border">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{artiste.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                        {artiste.image_url ? 'Image uploaded' : 'No image'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openArtisteImageDialog(artiste)}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {artiste.image_url ? 'Change Image' : 'Upload Image'}
                      </span>
                      <span className="sm:hidden">Upload</span>
                    </Button>
                  </div>
                </div>
              ))}
              {artistes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No artistes found. Artistes are automatically created when recitations are added.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openEventDialog()} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Event</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>

            <div className="grid gap-3">
              {events.map((event) => {
                const imam = imams.find(i => i.id === event.imam_id);
                const eventDate = new Date(event.event_date);
                const formattedDate = eventDate.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
                
                // Extract Hijri date from description
                const hijriMatch = event.description?.match(/Hijri:\s*(.+)/i);
                const hijriDate = hijriMatch ? hijriMatch[1].trim() : '';

                const getEventTypeColor = (type: EventType) => {
                  switch (type) {
                    case 'birthday':
                      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                    case 'death':
                      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                    case 'martyrdom':
                      return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                    default:
                      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
                  }
                };

                const getEventTypeLabel = (type: EventType) => {
                  switch (type) {
                    case 'birthday':
                      return 'Birthday';
                    case 'death':
                      return 'Death';
                    case 'martyrdom':
                      return 'Martyrdom';
                    default:
                      return 'Other';
                  }
                };

                return (
                  <div
                    key={event.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{event.event_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getEventTypeColor(event.event_type)}`}>
                          {getEventTypeLabel(event.event_type)}
                        </span>
                        {event.is_annual && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Annual
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formattedDate}
                          {hijriDate && ` • ${hijriDate}`}
                        </p>
                        {imam && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {imam.name}
                          </p>
                        )}
                        {event.description && !hijriDate && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEventDialog(event)}
                        className="h-9 w-9 sm:h-10 sm:w-10"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({ type: 'event', id: event.id })}
                        className="text-destructive hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No events yet. Add your first event!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openUserDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </div>
            <div className="grid gap-3">
              {userProfiles.map((userProfile) => {
                const isCurrentUser = currentUser && userProfile.id === currentUser.id;
                return (
                  <div
                    key={userProfile.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-card rounded-lg shadow-soft ${
                      isCurrentUser ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{userProfile.email}</h3>
                          {isCurrentUser && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              You
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 w-fit ${
                          userProfile.role === 'admin' 
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                            : userProfile.role === 'uploader'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                        }`}>
                          {userProfile.role}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                        {userProfile.full_name || 'No name provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openUserDialog(userProfile)}
                        title="Edit role"
                        className="h-9 w-9 sm:h-10 sm:w-10"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {userProfile.role === 'uploader' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPermissionDialog(userProfile)}
                          title="Manage permissions"
                          className="h-9 w-9 sm:h-10 sm:w-10"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Site Settings moved to separate page - /admin/site-settings */}
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


      {/* Holy Personality Dialog */}
      <Dialog open={imamDialogOpen} onOpenChange={setImamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingImam ? 'Edit Holy Personality' : 'Add Holy Personality'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="imam-name">Name</Label>
              <Input
                id="imam-name"
                value={imamForm.name}
                onChange={(e) => setImamForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Imam Ali (AS)"
              />
            </div>
            <div>
              <Label htmlFor="imam-slug">Slug</Label>
              <Input
                id="imam-slug"
                value={imamForm.slug}
                onChange={(e) => setImamForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g., imam-ali"
              />
            </div>
            <div>
              <Label htmlFor="imam-order">Order Index</Label>
              <Input
                id="imam-order"
                type="number"
                min="1"
                value={imamForm.order_index}
                onChange={(e) => setImamForm(f => ({ ...f, order_index: Math.max(parseInt(e.target.value) || 1, 1) }))}
                placeholder="e.g., 1, 2, 3, 4..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set the display order (1, 2, 3, 4...). Lower numbers appear first. Starts from 1.
              </p>
            </div>
            <div>
              <Label htmlFor="imam-title">Title (optional)</Label>
              <Input
                id="imam-title"
                value={imamForm.title}
                onChange={(e) => setImamForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Commander of the Faithful"
              />
            </div>
            <div>
              <Label htmlFor="imam-desc">Description</Label>
              <Textarea
                id="imam-desc"
                value={imamForm.description}
                onChange={(e) => setImamForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImamDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveImam}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Piece Dialog */}
      <Dialog open={pieceDialogOpen} onOpenChange={setPieceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPiece ? 'Edit Recitation' : 'Add New Recitation'}</DialogTitle>
            <DialogDescription>
              {editingPiece ? 'Update the recitation details below.' : 'Fill in the details to create a new recitation.'}
            </DialogDescription>
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
                  value={pieceForm.imam_id || "none"}
                  onValueChange={(v) => setPieceForm(f => ({ ...f, imam_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
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
              <p className="text-xs text-muted-foreground mb-2">
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
                      <Trash2 className="w-3 h-3" />
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
                    title="Add paragraph/shaair break point"
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
                className={`min-h-[250px] font-arabic ${targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'text-right' : 'text-left'}`}
                dir={targetLanguage === 'Kashmiri' || targetLanguage === 'Urdu' || targetLanguage === 'Arabic' ? 'rtl' : 'ltr'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 Tip: Click "Add Break" at the end of each paragraph/shaair for better formatting. Then translate to convert to {targetLanguage}.
              </p>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteDialog?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* User Role Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAddingUser ? 'Add New User' : 'Edit User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-email">Email {isAddingUser && <span className="text-destructive">*</span>}</Label>
              <Input 
                id="user-email"
                type="email"
                value={userForm.email} 
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                disabled={!isAddingUser}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="user-password">
                Password {isAddingUser ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input 
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  value={userForm.password} 
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={isAddingUser ? "At least 6 characters" : "Enter new password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="user-name">Full Name</Label>
              <Input 
                id="user-name"
                value={userForm.full_name} 
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input 
                id="user-phone"
                type="tel"
                value={userForm.phone_number} 
                onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="user-address">Address</Label>
              <Input 
                id="user-address"
                value={userForm.address} 
                onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div>
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) => setUserForm({ ...userForm, role: v as 'admin' | 'uploader' | 'user' })}
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="uploader">Uploader</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUser}>{isAddingUser ? 'Create User' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions for {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Category Permissions</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cat-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`cat-${category.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Ahlulbayt Permissions</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {imams.map((imam) => (
                  <div key={imam.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`imam-${imam.id}`}
                      checked={selectedImams.includes(imam.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedImams([...selectedImams, imam.id]);
                        } else {
                          setSelectedImams(selectedImams.filter(id => id !== imam.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`imam-${imam.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {imam.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>Cancel</Button>
            <Button onClick={savePermissions}>Save Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
            <DialogDescription>
              Manage calendar events with dates and related information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={eventForm.event_name}
                onChange={(e) => setEventForm(f => ({ ...f, event_name: e.target.value }))}
                placeholder="e.g., Birth of Imam Ali"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">Gregorian Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="hijri-date">Hijri Date</Label>
                <Input
                  id="hijri-date"
                  value={eventForm.hijri_date}
                  onChange={(e) => setEventForm(f => ({ ...f, hijri_date: e.target.value }))}
                  placeholder="e.g., 13 Rajab 1447"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type *</Label>
                <Select
                  value={eventForm.event_type}
                  onValueChange={(v) => setEventForm(f => ({ ...f, event_type: v as EventType }))}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="martyrdom">Martyrdom</SelectItem>
                    <SelectItem value="death">Death</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="event-imam">Imam / Personality</Label>
                <Select
                  value={eventForm.imam_id}
                  onValueChange={(v) => setEventForm(f => ({ ...f, imam_id: v }))}
                >
                  <SelectTrigger id="event-imam">
                    <SelectValue placeholder="Select an imam" />
                  </SelectTrigger>
                  <SelectContent>
                    {imams.map((imam) => (
                      <SelectItem key={imam.id} value={imam.id}>
                        {imam.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional information about the event..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Note: Hijri date will be automatically added to the description if provided above.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-annual"
                checked={eventForm.is_annual}
                onCheckedChange={(checked) => setEventForm(f => ({ ...f, is_annual: !!checked }))}
              />
              <Label
                htmlFor="event-annual"
                className="text-sm font-normal cursor-pointer"
              >
                Annual event (repeats every year)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEvent}>Save Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Artiste Image Upload Dialog */}
      <Dialog open={artisteImageDialogOpen} onOpenChange={setArtisteImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Image for {selectedArtiste?.name}</DialogTitle>
            <DialogDescription>
              Upload an optimized image for this artist. Images are automatically resized to 200x200px and compressed for optimal website performance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="artiste-image">Image File</Label>
              <div className="mt-2">
                <input
                  ref={artisteImageInputRef}
                  type="file"
                  id="artiste-image"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleArtisteImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => artisteImageInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Image
                </Button>
                {artisteImageFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: {artisteImageFile.name} ({formatFileSize(artisteImageFile.size)})
                  </p>
                )}
              </div>
            </div>

            {artisteImagePreview && (
              <div className="relative">
                <Label>Preview</Label>
                <div className="mt-2 relative inline-block">
                  <img
                    src={artisteImagePreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                  />
                  {artisteImageFile && (
                    <div className="absolute -bottom-2 left-0 right-0 text-center">
                      <span className="text-xs bg-background px-2 py-1 rounded border border-border">
                        Will be optimized to ~200x200px
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedArtiste?.image_url && !artisteImageFile && (
              <div>
                <Label>Current Image</Label>
                <div className="mt-2">
                  <img
                    src={selectedArtiste.image_url}
                    alt={selectedArtiste.name}
                    className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArtisteImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={uploadArtisteImage}
              disabled={!artisteImageFile || uploadingArtisteImage}
              className="gap-2"
            >
              {uploadingArtisteImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
