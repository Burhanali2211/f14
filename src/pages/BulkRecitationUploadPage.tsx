import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Upload, FileText, Check, X, Loader2, Save, CheckSquare, Square, FileCheck, AlertCircle, Edit } from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { Category, Imam } from '@/lib/supabase-types';
import { ReciterCombobox } from '@/components/ReciterCombobox';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';

// Configure PDF.js worker - use local worker file from public directory to avoid CORS issues
// The worker file is copied to public/pdf.worker.min.mjs during build
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Helper function to create PDF from images
async function createPDFFromImages(imageBlobs: Blob[], title: string): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < imageBlobs.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    const imgData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlobs[i]);
    });

    // Get image dimensions
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgData;
    });

    // Calculate dimensions to fit A4 page (210mm x 297mm) with margins
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);

    const imgWidth = img.width;
    const imgHeight = img.height;
    const imgAspectRatio = imgWidth / imgHeight;

    let width = maxWidth;
    let height = maxWidth / imgAspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * imgAspectRatio;
    }

    // Center the image on the page
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, width, height);
  }

  return pdf.output('blob');
}

interface ExtractedRecitation {
  id: string;
  pageNumber: number;
  title: string;
  imageDataUrl: string; // Base64 or data URL of the rendered page
  imageBlob?: Blob; // Blob for uploading
  selected: boolean;
  customTitle?: string;
  groupId?: string; // ID of the group this recitation belongs to
}

interface RecitationGroup {
  id: string;
  name: string;
  recitationIds: string[]; // IDs of recitations in this group
}

export default function BulkRecitationUploadPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [recitations, setRecitations] = useState<ExtractedRecitation[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [groups, setGroups] = useState<RecitationGroup[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTargetRef = useRef<string | null>(null);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Save scroll position when opening viewer or dialog
  useEffect(() => {
    if (imageViewerOpen || metadataDialogOpen) {
      // Save current scroll position
      const currentScroll = window.scrollY || document.documentElement.scrollTop || window.pageYOffset;
      scrollPositionRef.current = currentScroll;
      
      // Prevent body scroll while maintaining position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${currentScroll}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position after a brief delay to ensure DOM is ready
      const scrollPosition = scrollPositionRef.current;
      
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto'
        });
      });
    }

    return () => {
      // Cleanup on unmount
      if (!imageViewerOpen && !metadataDialogOpen) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }
    };
  }, [imageViewerOpen, metadataDialogOpen]);
  
  // Metadata form for selected recitations
  const [metadata, setMetadata] = useState({
    category_id: '',
    imam_id: '',
    reciter: '',
    language: 'Urdu',
    video_url: '',
  });

  useEffect(() => {
    if (roleLoading) return;
    
    if (role !== 'admin' && role !== 'uploader') {
      toast({
        title: 'Access Denied',
        description: 'You need admin or uploader permissions to access this page.',
        variant: 'destructive',
      });
      navigate('/admin');
      return;
    }
    
    fetchData();
  }, [role, roleLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, imamRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        (supabase as any).from('imams').select('*').order('order_index, name'),
      ]);

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
        toast({
          title: 'Error',
          description: 'Failed to load categories',
          variant: 'destructive',
        });
      }
      if (imamRes.error) {
        logger.error('Error fetching imams:', imamRes.error);
        toast({
          title: 'Error',
          description: 'Failed to load figures',
          variant: 'destructive',
        });
      }

      if (catRes.data) {
        setCategories(catRes.data as Category[]);
        if (catRes.data.length > 0 && !metadata.category_id) {
          setMetadata(m => ({ ...m, category_id: catRes.data[0].id }));
        }
      }
      if (imamRes.data) {
        setImams(imamRes.data as Imam[]);
      }
    } catch (error) {
      logger.error('Error in fetchData:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setRecitations([]);
      setSelectedCount(0);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
    }
  };

  const parsePDF = async () => {
    if (!pdfFile) return;

    setParsing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      
      const extracted: ExtractedRecitation[] = [];
      
      // Render each page as an image
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        // Convert canvas to blob and data URL
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', 0.95); // High quality JPEG
        });
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        extracted.push({
          id: `page-${pageNum}`,
          pageNumber: pageNum,
          title: `Page ${pageNum}`, // Just page number, no "Recitation" default
          imageDataUrl: dataUrl,
          imageBlob: blob,
          selected: false,
        });
      }
      
      setRecitations(extracted);
      setSelectedCount(0);
      
      toast({
        title: 'Success',
        description: `Extracted ${extracted.length} page(s) from PDF as images`,
      });
    } catch (error) {
      logger.error('Error parsing PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to parse PDF. Please check if the file is valid.',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };


  const toggleRecitationSelection = (id: string) => {
    const recitation = recitations.find(r => r.id === id);
    // Don't allow selecting if already in a group
    if (recitation?.groupId) {
      return;
    }
    
    setRecitations(prev => {
      const updated = prev.map(r => 
        r.id === id ? { ...r, selected: !r.selected } : r
      );
      setSelectedCount(updated.filter(r => r.selected && !r.groupId).length);
      return updated;
    });
  };

  const createGroup = () => {
    const selected = recitations.filter(r => r.selected && !r.groupId);
    if (selected.length < 2) {
      toast({
        title: 'Need Multiple Selections',
        description: 'Please select at least 2 recitations to create a group',
        variant: 'destructive',
      });
      return;
    }

    const groupId = `group-${Date.now()}`;
    const groupName = ''; // No default name - user must provide
    
    // Create group
    const newGroup: RecitationGroup = {
      id: groupId,
      name: groupName,
      recitationIds: selected.map(r => r.id),
    };
    
    setGroups(prev => [...prev, newGroup]);
    
    // Update recitations to belong to this group
    setRecitations(prev => {
      const updated = prev.map(r => 
        selected.some(s => s.id === r.id) 
          ? { ...r, groupId, selected: false } 
          : r
      );
      setSelectedCount(updated.filter(r => r.selected && !r.groupId).length);
      return updated;
    });

    toast({
      title: 'Group Created',
      description: `${selected.length} recitations grouped together`,
    });
  };

  const removeGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Remove group and ungroup recitations
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setRecitations(prev => {
      const updated = prev.map(r => 
        r.groupId === groupId 
          ? { ...r, groupId: undefined, selected: false } 
          : r
      );
      setSelectedCount(updated.filter(r => r.selected && !r.groupId).length);
      return updated;
    });

    toast({
      title: 'Group Removed',
      description: 'Recitations are now ungrouped',
    });
  };

  const updateGroupName = (groupId: string, name: string) => {
    setGroups(prev => 
      prev.map(g => g.id === groupId ? { ...g, name } : g)
    );
  };

  const toggleSelectAll = () => {
    const ungrouped = recitations.filter(r => !r.groupId);
    const allSelected = ungrouped.every(r => r.selected);
    setRecitations(prev => {
      const updated = prev.map(r => 
        r.groupId ? r : { ...r, selected: !allSelected }
      );
      setSelectedCount(updated.filter(r => r.selected && !r.groupId).length);
      return updated;
    });
  };

  const updateRecitationTitle = (id: string, title: string) => {
    setRecitations(prev =>
      prev.map(r => (r.id === id ? { ...r, customTitle: title } : r))
    );
  };

  const handleSaveSelected = async () => {
    // Only save groups - individual selections must be grouped first
    const groupsToSave = groups.filter(g => g.name && g.name.trim()); // Only save groups with names
    
    if (groupsToSave.length === 0) {
      toast({
        title: 'No Groups',
        description: 'Please create groups and name them to save. Select 2-3 pages and click "Group Selected".',
        variant: 'destructive',
      });
      return;
    }

    if (!metadata.category_id) {
      toast({
        title: 'Missing Category',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Upload images and create pieces
      // Note: Authentication is already checked at page level via useUserRole hook
      const piecesToInsert = [];
      
      // Only save groups - all pages must be grouped

      // Save groups (combine multiple pages into one recitation)
      for (const group of groupsToSave) {
        // Require name for group
        if (!group.name || group.name.trim() === '') {
          const groupRecitations = recitations.filter(r => r.groupId === group.id);
          const pageNumbers = groupRecitations.map(r => r.pageNumber).sort((a, b) => a - b);
          toast({
            title: 'Missing Name',
            description: `Please provide a name for the group containing pages ${pageNumbers.join(', ')}`,
            variant: 'destructive',
          });
          continue;
        }

        const groupRecitations = recitations.filter(r => r.groupId === group.id);
        if (groupRecitations.length === 0) {
          logger.warn('Group has no recitations:', group.id);
          continue;
        }

        // Get all image blobs for the group
        const imageBlobs: Blob[] = [];
        for (const rec of groupRecitations) {
          // Recreate blob from dataUrl if missing
          let imageBlob = rec.imageBlob;
          if (!imageBlob && rec.imageDataUrl) {
            try {
              const parts = rec.imageDataUrl.split(',');
              if (parts.length !== 2) {
                logger.error('Invalid dataUrl format for recitation:', rec.id);
                continue;
              }
              const byteString = atob(parts[1]);
              const mimeString = parts[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              imageBlob = new Blob([ab], { type: mimeString });
            } catch (error) {
              logger.error('Error recreating blob from dataUrl:', error);
              continue;
            }
          }
          
          if (!imageBlob) {
            logger.error('Missing image blob for group recitation:', rec.id);
            continue;
          }

          imageBlobs.push(imageBlob);
        }

        if (imageBlobs.length === 0) {
          toast({
            title: 'Error',
            description: `Failed to process images for group: ${group.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // Upload first 2 images as separate images (for display at top)
        const imageUrls: string[] = [];
        const imagesToUpload = Math.min(2, imageBlobs.length);
        
        for (let i = 0; i < imagesToUpload; i++) {
          try {
            // Validate blob before processing
            if (!imageBlobs[i] || imageBlobs[i].size === 0) {
              logger.error('Invalid blob for group image:', { groupId: group.id, index: i });
              toast({
                title: 'Image Error',
                description: `Image ${i + 1} is invalid or empty. Skipping...`,
                variant: 'destructive',
              });
              continue;
            }

            // Check blob size (max 50MB before optimization)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (imageBlobs[i].size > maxSize) {
              logger.error('Blob too large:', { size: imageBlobs[i].size, maxSize });
              toast({
                title: 'Image Too Large',
                description: `Image ${i + 1} is too large (${(imageBlobs[i].size / 1024 / 1024).toFixed(2)}MB). Skipping...`,
                variant: 'destructive',
              });
              continue;
            }

            const imageFile = new File([imageBlobs[i]], `group-${group.id}-page-${groupRecitations[i].pageNumber}.jpg`, {
              type: 'image/jpeg',
            });

            const { optimizeRecitationImage } = await import('@/lib/image-optimizer');
            const optimizedBlob = await optimizeRecitationImage(imageFile);
            
            // Validate optimized blob
            if (!optimizedBlob || optimizedBlob.size === 0) {
              logger.error('Optimized blob is invalid or empty');
              toast({
                title: 'Optimization Error',
                description: `Failed to optimize image ${i + 1}. Skipping...`,
                variant: 'destructive',
              });
              continue;
            }
            
            const fileName = `bulk-upload-group-${Date.now()}-${group.id}-page-${groupRecitations[i].pageNumber}.webp`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('piece-images')
              .upload(fileName, optimizedBlob, {
                cacheControl: '31536000',
                upsert: false,
                contentType: 'image/webp',
              });

            if (uploadError) {
              logger.error('Error uploading group image:', {
                error: uploadError,
                message: uploadError.message,
                statusCode: uploadError.statusCode,
                fileName,
                blobSize: optimizedBlob.size,
              });
              
              // Provide more specific error messages
              let errorMessage = 'Failed to upload image';
              if (uploadError.message?.includes('CORS') || uploadError.message?.includes('NetworkError')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
              } else if (uploadError.message?.includes('Bucket not found')) {
                errorMessage = 'Storage bucket not found. Please contact an administrator.';
              } else if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('permission')) {
                errorMessage = 'Permission denied. You may not have permission to upload images.';
              } else if (uploadError.message) {
                errorMessage = uploadError.message;
              }
              
              toast({
                title: 'Upload Error',
                description: `Image ${i + 1}: ${errorMessage}`,
                variant: 'destructive',
              });
              continue;
            }

            if (!uploadData?.path) {
              logger.error('Group image upload succeeded but no path returned');
              toast({
                title: 'Upload Error',
                description: `Image ${i + 1} uploaded but failed to get URL. Skipping...`,
                variant: 'destructive',
              });
              continue;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('piece-images')
              .getPublicUrl(uploadData.path);
            
            imageUrls.push(publicUrl);
          } catch (imgError: any) {
            logger.error('Error processing group image:', {
              error: imgError,
              message: imgError?.message,
              stack: imgError?.stack,
              groupId: group.id,
              index: i,
            });
            toast({
              title: 'Image Processing Error',
              description: `Error processing image ${i + 1}: ${imgError?.message || 'Unknown error'}`,
              variant: 'destructive',
            });
            continue;
          }
        }

        // Create PDF from all images in the group
        let pdfUrl: string | null = null;
        try {
          const pdfBlob = await createPDFFromImages(imageBlobs, group.name.trim());
          
          // Validate PDF blob
          if (!pdfBlob || pdfBlob.size === 0) {
            throw new Error('PDF blob is invalid or empty');
          }
          
          const pdfFileName = `bulk-upload-group-${Date.now()}-${group.id}.pdf`;
          
          const { data: pdfUploadData, error: pdfUploadError } = await supabase.storage
            .from('piece-images')
            .upload(pdfFileName, pdfBlob, {
              cacheControl: '31536000',
              upsert: false,
              contentType: 'application/pdf',
            });

          if (pdfUploadError) {
            logger.error('Error uploading PDF:', {
              error: pdfUploadError,
              message: pdfUploadError.message,
              statusCode: pdfUploadError.statusCode,
              fileName: pdfFileName,
              blobSize: pdfBlob.size,
            });
            
            // Provide more specific error messages
            let errorMessage = 'Failed to upload PDF';
            if (pdfUploadError.message?.includes('CORS') || pdfUploadError.message?.includes('NetworkError')) {
              errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (pdfUploadError.message?.includes('Bucket not found')) {
              errorMessage = 'Storage bucket not found. Please contact an administrator.';
            } else if (pdfUploadError.message?.includes('row-level security') || pdfUploadError.message?.includes('permission')) {
              errorMessage = 'Permission denied. You may not have permission to upload files.';
            } else if (pdfUploadError.message) {
              errorMessage = pdfUploadError.message;
            }
            
            throw new Error(errorMessage);
          }

          if (!pdfUploadData?.path) {
            logger.error('PDF upload succeeded but no path returned');
            throw new Error('PDF upload failed - no path returned');
          }

          const { data: { publicUrl } } = supabase.storage
            .from('piece-images')
            .getPublicUrl(pdfUploadData.path);
          
          pdfUrl = publicUrl;
        } catch (pdfError: any) {
          logger.error('Error creating/uploading PDF:', {
            error: pdfError,
            message: pdfError?.message,
            stack: pdfError?.stack,
            groupId: group.id,
            groupName: group.name,
          });
          toast({
            title: 'PDF Creation Error',
            description: `Failed to create PDF for ${group.name}: ${pdfError?.message || 'Unknown error'}. Images will be saved instead.`,
            variant: 'destructive',
          });
          // Fallback: if PDF creation fails, use all images
          if (imageUrls.length === 0) {
            continue;
          }
        }

        // Create one piece for the group
        const pageNumbers = groupRecitations.map(r => r.pageNumber).sort((a, b) => a - b);
        const textContent = pdfUrl 
          ? `Recitation from PDF pages ${pageNumbers.join(', ')}. PDF document available.`
          : `Recitation from PDF pages ${pageNumbers.join(', ')}. Contains ${imageBlobs.length} image(s).`;
        
        // Store: first 2 images as image_url, PDF URL appended if available
        const imageUrlString = imageUrls.length > 0 ? imageUrls.join(',') : '';
        const finalImageUrl = pdfUrl ? (imageUrlString ? `${imageUrlString},${pdfUrl}` : pdfUrl) : imageUrlString;

        piecesToInsert.push({
          title: group.name.trim(),
          category_id: metadata.category_id,
          imam_id: metadata.imam_id || null,
          reciter: metadata.reciter || null,
          language: metadata.language,
          video_url: metadata.video_url || null,
          text_content: textContent,
          image_url: finalImageUrl || null,
          view_count: 0,
        } as any);
      }

      if (piecesToInsert.length === 0) {
        throw new Error(`No pieces were created. ${groupsToSave.length} groups were processed but no images were uploaded. Please check image uploads and try again.`);
      }

      const { data, error } = await authenticatedQuery(async () => {
        return await supabase
          .from('pieces')
          .insert(piecesToInsert)
          .select();
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: `Successfully saved ${piecesToInsert.length} recitation(s) with images`,
      });

      // Remove saved groups from list
      const savedGroupIds = groupsToSave.map(g => g.id);
      const savedRecitationIds = new Set<string>();
      groupsToSave.forEach(g => {
        recitations.filter(r => r.groupId === g.id).forEach(r => savedRecitationIds.add(r.id));
      });
      
      setRecitations(prev => {
        const updated = prev.filter(r => !savedRecitationIds.has(r.id));
        setSelectedCount(updated.filter(r => r.selected && !r.groupId).length);
        return updated;
      });
      setGroups(prev => prev.filter(g => !savedGroupIds.includes(g.id)));

      // Reset metadata if all recitations are saved
      if (recitations.length === savedRecitationIds.size) {
        setPdfFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      logger.error('Error saving recitations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save recitations',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 sm:py-6 md:py-8">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Admin</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Bulk Recitation Upload
                </h1>
                  <p className="text-muted-foreground">
                  Upload a PDF file. Each page will be rendered as an image. Select the pages you want to add as recitations, name them, and save them all at once.
                </p>
              </div>
            </div>
          </div>

          {/* PDF Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Select a PDF file containing multiple recitations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>
                <Button
                  onClick={parsePDF}
                  disabled={!pdfFile || parsing}
                  className="w-full sm:w-auto"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Parse PDF
                    </>
                  )}
                </Button>
              </div>
              
              {pdfFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCheck className="w-4 h-4" />
                  <span>{pdfFile.name}</span>
                  <span className="text-xs">({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata Form - Hidden, moved to Dialog */}
          {recitations.length > 0 && (
            <Card className="hidden">
              <CardHeader>
                <CardTitle>Metadata for Selected Recitations</CardTitle>
                <CardDescription>
                  This metadata will be applied to all selected recitations when you save
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Groups Section */}
                {groups.length > 0 && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold block">
                          Name Your Recitations ({groups.length}) *:
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Each group = ONE recitation with multiple images. Name is required.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={createGroup}
                        disabled={selectedCount < 2}
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Group More
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {groups.map((group) => {
                        const groupRecitations = recitations.filter(r => r.groupId === group.id);
                        const pageNumbers = groupRecitations.map(r => r.pageNumber).sort((a, b) => a - b);
                        return (
                          <div
                            key={group.id}
                            className="p-3 bg-background rounded-md border space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground min-w-[100px]">
                                Pages {pageNumbers.join(', ')} *:
                              </Label>
                              <Input
                                value={group.name}
                                onChange={(e) => updateGroupName(group.id, e.target.value)}
                                placeholder="Enter recitation name (required)"
                                className="flex-1"
                                required
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGroup(group.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            {group.name && group.name.trim() && (
                              <div className="text-xs text-muted-foreground ml-[108px]">
                                Will be saved as: <span className="font-medium text-foreground">{group.name}</span> ({groupRecitations.length} image{groupRecitations.length !== 1 ? 's' : ''})
                              </div>
                            )}
                            {(!group.name || !group.name.trim()) && (
                              <div className="text-xs text-destructive ml-[108px]">
                                ⚠️ Name is required to save this recitation
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      💡 Select 2-3 pages, click "Group Selected", then name the recitation. All images will be saved together.
                    </p>
                  </div>
                )}

                {/* Unselected pages - show prompt to group */}
                {selectedCount > 0 && groups.length === 0 && (
                  <div className="p-4 bg-muted rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold block">
                          Selected Pages ({selectedCount}):
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Group pages together to create one recitation with multiple images
                        </p>
                      </div>
                      {selectedCount >= 2 && (
                        <Button
                          onClick={createGroup}
                          className="bg-primary text-primary-foreground"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Group Selected Pages
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {recitations
                        .filter(r => r.selected && !r.groupId)
                        .map((rec) => (
                          <div
                            key={rec.id}
                            className="px-3 py-2 bg-background rounded border text-sm"
                          >
                            Page {rec.pageNumber}
                          </div>
                        ))}
                    </div>
                    {selectedCount < 2 && (
                      <p className="text-xs text-muted-foreground pt-2 border-t">
                        💡 Select at least 2 pages to create a group. Groups combine multiple pages into one recitation.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={metadata.category_id}
                      onValueChange={(value) => setMetadata(m => ({ ...m, category_id: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imam">Dedicated To (Figure)</Label>
                    <Select
                      value={metadata.imam_id || "none"}
                      onValueChange={(value) => setMetadata(m => ({ ...m, imam_id: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger id="imam">
                        <SelectValue placeholder="Select figure (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {imams.map((imam) => (
                          <SelectItem key={imam.id} value={imam.id}>
                            {imam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reciter">Reciter</Label>
                    <ReciterCombobox
                      id="reciter"
                      value={metadata.reciter}
                      onChange={(value) => setMetadata(m => ({ ...m, reciter: value }))}
                      placeholder="Search or enter reciter name (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={metadata.language}
                      onValueChange={(value) => setMetadata(m => ({ ...m, language: value }))}
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Urdu">Urdu</SelectItem>
                        <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Persian">Persian</SelectItem>
                        <SelectItem value="Hinglish">Hinglish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* YouTube Video URL */}
                <div className="space-y-2">
                  <Label htmlFor="video_url">YouTube Video URL (Optional)</Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={metadata.video_url}
                    onChange={(e) => setMetadata(m => ({ ...m, video_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a YouTube video link if this recitation has an associated video
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {groups.length > 0 ? (
                      <span>{groups.length} recitation{groups.length !== 1 ? 's' : ''} ready to save</span>
                    ) : (
                      <span>{selectedCount} of {recitations.length} pages selected - Group them to save</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                      disabled={recitations.length === 0}
                    >
                      {recitations.every(r => r.selected || r.groupId) ? (
                        <>
                          <Square className="w-4 h-4 mr-2" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Select All
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSaveSelected}
                      disabled={groups.length === 0 || !metadata.category_id || saving || groups.some(g => !g.name || !g.name.trim())}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save {groups.length} Recitation{groups.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Floating Action Button */}
          {(selectedCount > 0 || groups.length > 0) && (
            <div className="fixed bottom-6 right-6 z-40">
              <Button
                onClick={() => {
                  // Save scroll position before opening
                  scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
                  setMetadataDialogOpen(true);
                }}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 sm:h-16 sm:w-16 relative"
                aria-label="Open metadata form"
              >
                <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
                {(groups.length > 0 || selectedCount > 0) && (
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center border-2 border-background">
                    {groups.length > 0 ? groups.length : selectedCount}
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Metadata Dialog - Centered Modal */}
          <Dialog open={metadataDialogOpen} onOpenChange={setMetadataDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Save Your Recitations</DialogTitle>
                <DialogDescription className="text-base">
                  Follow these simple steps to save your selected pages
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Simple Instructions */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    How to Save:
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>Select 2-3 pages from the PDF below</li>
                    <li>Click the button below to group them</li>
                    <li>Give your recitation a name</li>
                    <li>Fill in the details (category is required)</li>
                    <li>Click "Save" to upload</li>
                  </ol>
                </div>
                {/* Step 1: Group Selected Pages */}
                {selectedCount > 0 && groups.length === 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                          Step 1: Group Your Pages ({selectedCount} selected)
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {selectedCount >= 2 
                            ? "Click the button to combine these pages into one recitation"
                            : "Select at least 2 pages to continue"}
                        </p>
                      </div>
                      {selectedCount >= 2 && (
                        <Button
                          onClick={createGroup}
                          className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Group Pages
                        </Button>
                      )}
                    </div>
                    {selectedCount >= 2 && (
                      <div className="flex flex-wrap gap-2">
                        {recitations
                          .filter(r => r.selected && !r.groupId)
                          .map((rec) => (
                            <span
                              key={rec.id}
                              className="px-3 py-1 bg-white dark:bg-gray-800 rounded border text-sm font-medium"
                            >
                              Page {rec.pageNumber}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Name Your Recitations */}
                {groups.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg">
                        Step 2: Name Your Recitations ({groups.length})
                      </h4>
                      {selectedCount >= 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={createGroup}
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Add More Groups
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {groups.map((group) => {
                        const groupRecitations = recitations.filter(r => r.groupId === group.id);
                        const pageNumbers = groupRecitations.map(r => r.pageNumber).sort((a, b) => a - b);
                        return (
                          <div
                            key={group.id}
                            className="p-4 bg-background rounded-lg border-2 space-y-2"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Pages {pageNumbers.join(', ')}:
                                  </span>
                                </div>
                                <Input
                                  value={group.name}
                                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                                  placeholder="Enter recitation name (required)"
                                  className="text-base"
                                  required
                                />
                                {group.name && group.name.trim() ? (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    ✓ Ready to save ({groupRecitations.length} image{groupRecitations.length !== 1 ? 's' : ''})
                                  </p>
                                ) : (
                                  <p className="text-xs text-destructive">
                                    ⚠️ Please enter a name for this recitation
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeGroup(group.id)}
                                className="text-destructive hover:text-destructive shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={metadata.category_id}
                      onValueChange={(value) => setMetadata(m => ({ ...m, category_id: value }))}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imam">Dedicated To (Figure)</Label>
                    <Select
                      value={metadata.imam_id || "none"}
                      onValueChange={(value) => setMetadata(m => ({ ...m, imam_id: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger id="imam">
                        <SelectValue placeholder="Select figure (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {imams.map((imam) => (
                          <SelectItem key={imam.id} value={imam.id}>
                            {imam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reciter">Reciter</Label>
                    <ReciterCombobox
                      id="reciter"
                      value={metadata.reciter}
                      onChange={(value) => setMetadata(m => ({ ...m, reciter: value }))}
                      placeholder="Search or enter reciter name (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={metadata.language}
                      onValueChange={(value) => setMetadata(m => ({ ...m, language: value }))}
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Urdu">Urdu</SelectItem>
                        <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Persian">Persian</SelectItem>
                        <SelectItem value="Hinglish">Hinglish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* YouTube Video URL */}
                <div className="space-y-2">
                  <Label htmlFor="video_url">YouTube Video URL (Optional)</Label>
                  <Input
                    id="video_url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={metadata.video_url}
                    onChange={(e) => setMetadata(m => ({ ...m, video_url: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add a YouTube video link if this recitation has an associated video
                  </p>
                </div>

                {/* Step 4: Save */}
                {groups.length > 0 && (
                  <DialogFooter className="pt-6 border-t gap-3 sm:gap-0">
                    <div className="text-sm text-muted-foreground flex-1">
                      {groups.filter(g => g.name && g.name.trim()).length} of {groups.length} recitation{groups.length !== 1 ? 's' : ''} ready
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setMetadataDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          await handleSaveSelected();
                          setMetadataDialogOpen(false);
                        }}
                        disabled={!metadata.category_id || saving || groups.some(g => !g.name || !g.name.trim())}
                        className="min-w-[140px]"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save {groups.filter(g => g.name && g.name.trim()).length} Recitation{groups.filter(g => g.name && g.name.trim()).length !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Recitations List */}
          {recitations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Extracted Recitations ({recitations.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recitations.map((recitation) => {
                  const isGrouped = !!recitation.groupId;
                  const group = groups.find(g => g.id === recitation.groupId);
                  return (
                  <Card
                    key={recitation.id}
                    className={`transition-all ${
                      isGrouped
                        ? 'opacity-50 grayscale-[0.3] border-dashed'
                        : recitation.selected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {!isGrouped && (
                              <Checkbox
                                checked={recitation.selected}
                                onCheckedChange={() => toggleRecitationSelection(recitation.id)}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isGrouped}
                              />
                            )}
                            {isGrouped && (
                              <div className="w-4 h-4 rounded border-2 border-primary/30 flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary/50" />
                              </div>
                            )}
                            <CardTitle className="text-base line-clamp-2">
                              {isGrouped && group ? (
                                <span className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Group:</span>
                                  <span>{group.name}</span>
                                </span>
                              ) : (
                                recitation.title
                              )}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                      {isGrouped && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Grouped - Click "Remove Group" to ungroup
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Display PDF page as image */}
                      <div
                        data-image-preview
                        className="w-full rounded-lg overflow-hidden border bg-muted cursor-pointer select-none relative group"
                        style={{ height: '320px' }}
                        title="Click to select • Long press to preview"
                        onMouseDown={(e) => {
                          if (isGrouped) return;
                          e.stopPropagation();
                          e.preventDefault();
                          
                          // Start long press timer
                          longPressTargetRef.current = recitation.id;
                          longPressTimerRef.current = setTimeout(() => {
                            // Long press detected - open preview
                            if (longPressTargetRef.current === recitation.id && recitation.imageDataUrl) {
                              // Save scroll position before opening preview
                              scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
                              const allImages = recitations
                                .filter(r => r.imageDataUrl)
                                .map(r => r.imageDataUrl);
                              const imageIndex = allImages.indexOf(recitation.imageDataUrl);
                              setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
                              setImageViewerOpen(true);
                              if (metadataDialogOpen) {
                                setMetadataDialogOpen(false);
                              }
                            }
                            longPressTargetRef.current = null;
                          }, 500); // 500ms for long press
                        }}
                        onMouseUp={(e) => {
                          if (isGrouped) return;
                          e.stopPropagation();
                          e.preventDefault();
                          
                          // Clear long press timer
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          
                          // If it was a short click (not long press), toggle selection
                          if (longPressTargetRef.current === recitation.id) {
                            toggleRecitationSelection(recitation.id);
                            longPressTargetRef.current = null;
                          }
                        }}
                        onMouseLeave={(e) => {
                          // Cancel long press if mouse leaves
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          longPressTargetRef.current = null;
                        }}
                        onTouchStart={(e) => {
                          if (isGrouped) return;
                          e.stopPropagation();
                          e.preventDefault();
                          
                          // Start long press timer for touch
                          longPressTargetRef.current = recitation.id;
                          longPressTimerRef.current = setTimeout(() => {
                            // Long press detected - open preview
                            if (longPressTargetRef.current === recitation.id && recitation.imageDataUrl) {
                              // Save scroll position before opening preview
                              scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
                              const allImages = recitations
                                .filter(r => r.imageDataUrl)
                                .map(r => r.imageDataUrl);
                              const imageIndex = allImages.indexOf(recitation.imageDataUrl);
                              setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
                              setImageViewerOpen(true);
                              if (metadataDialogOpen) {
                                setMetadataDialogOpen(false);
                              }
                            }
                            longPressTargetRef.current = null;
                          }, 500); // 500ms for long press
                        }}
                        onTouchEnd={(e) => {
                          if (isGrouped) return;
                          e.stopPropagation();
                          e.preventDefault();
                          
                          // Clear long press timer
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          
                          // If it was a short tap (not long press), toggle selection
                          if (longPressTargetRef.current === recitation.id) {
                            toggleRecitationSelection(recitation.id);
                            longPressTargetRef.current = null;
                          }
                        }}
                        onTouchCancel={(e) => {
                          // Cancel long press if touch is cancelled
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          longPressTargetRef.current = null;
                        }}
                      >
                        {recitation.imageDataUrl ? (
                          <img
                            src={recitation.imageDataUrl}
                            alt={`Page ${recitation.pageNumber}`}
                            className="w-full h-full object-cover object-top pointer-events-none"
                            loading="lazy"
                            style={{ objectPosition: 'top center' }}
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <div className="text-center p-4">
                              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Image not loaded</p>
                              <p className="text-xs mt-1">Re-upload PDF to restore</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}

          {recitations.length === 0 && pdfFile && !parsing && (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No pages could be extracted from this PDF. 
                  Try parsing again or check if the PDF file is valid.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative w-full h-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <DialogTitle className="text-lg">
                Page {recitations[currentImageIndex]?.pageNumber || 1} of {recitations.filter(r => r.imageDataUrl).length}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageViewerOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Image Container */}
            <div className="flex-1 overflow-auto bg-black/5 dark:bg-black/20 flex items-center justify-center p-4">
              {recitations[currentImageIndex]?.imageDataUrl && (
                <img
                  src={recitations[currentImageIndex].imageDataUrl}
                  alt={`Page ${recitations[currentImageIndex]?.pageNumber || 1}`}
                  className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
            
            {/* Navigation Controls */}
            {recitations.filter(r => r.imageDataUrl).length > 1 && (
              <div className="flex items-center justify-between p-4 border-t gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const prevIndex = currentImageIndex > 0 
                      ? currentImageIndex - 1 
                      : recitations.filter(r => r.imageDataUrl).length - 1;
                    setCurrentImageIndex(prevIndex);
                  }}
                  disabled={recitations.filter(r => r.imageDataUrl).length <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  {currentImageIndex + 1} / {recitations.filter(r => r.imageDataUrl).length}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    const nextIndex = currentImageIndex < recitations.filter(r => r.imageDataUrl).length - 1
                      ? currentImageIndex + 1
                      : 0;
                    setCurrentImageIndex(nextIndex);
                  }}
                  disabled={recitations.filter(r => r.imageDataUrl).length <= 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

