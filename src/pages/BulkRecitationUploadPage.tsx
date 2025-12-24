import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, Check, X, Loader2, Save, CheckSquare, Square, FileCheck, AlertCircle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { FullscreenImageViewer } from '@/components/FullscreenImageViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { Category, Imam } from '@/lib/supabase-types';
import { ReciterCombobox } from '@/components/ReciterCombobox';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use local worker file from public directory to avoid CORS issues
// The worker file is copied to public/pdf.worker.min.mjs during build
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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
  
  // Metadata form for selected recitations
  const [metadata, setMetadata] = useState({
    category_id: '',
    imam_id: '',
    reciter: '',
    language: 'Urdu',
    video_url: '',
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('bulk-upload-session');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.recitations && parsed.recitations.length > 0) {
          // Restore recitations (without imageDataUrl - images need to be re-extracted)
          const restoredRecitations = parsed.recitations.map((r: any) => ({
            ...r,
            imageDataUrl: '', // Images not stored - need to re-extract from PDF
            imageBlob: undefined,
          }));
          setRecitations(restoredRecitations);
          
          // Restore groups
          if (parsed.groups) {
            setGroups(parsed.groups);
          }
          
          // Restore metadata
          if (parsed.metadata) {
            setMetadata(parsed.metadata);
          }
          
          // Restore PDF file info (we can't restore the actual file, but we know it was there)
          if (parsed.pdfFileName) {
            // Create a dummy file object for display purposes
            const dummyFile = new File([], parsed.pdfFileName, { type: 'application/pdf' });
            Object.defineProperty(dummyFile, 'size', { value: parsed.pdfFileSize || 0 });
            setPdfFile(dummyFile);
          }
          
          toast({
            title: 'Session Restored',
            description: `Restored ${restoredRecitations.length} page(s) with selections and groups. Re-upload the PDF to restore images.`,
            variant: 'default',
          });
        }
      }
    } catch (error) {
      logger.error('Error loading from localStorage:', error);
      // If corrupted, clear it
      try {
        localStorage.removeItem('bulk-upload-session');
      } catch (clearError) {
        logger.error('Error clearing corrupted session:', clearError);
      }
    }
  }, []);

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

  // Save to localStorage whenever data changes (without image data to avoid quota issues)
  useEffect(() => {
    if (recitations.length > 0) {
      try {
        // Only save essential metadata - NOT image data URLs (too large for localStorage)
        const dataToSave = {
          recitations: recitations.map(r => ({
            id: r.id,
            pageNumber: r.pageNumber,
            title: r.title,
            // Don't store imageDataUrl - it's too large and causes quota errors
            // Images will need to be re-extracted from PDF when restoring
            selected: r.selected,
            customTitle: r.customTitle,
            groupId: r.groupId,
          })),
          groups,
          metadata,
          pdfFileName: pdfFile?.name,
          pdfFileSize: pdfFile?.size,
          timestamp: Date.now(),
        };
        
        const dataString = JSON.stringify(dataToSave);
        const dataSize = new Blob([dataString]).size;
        
        // Check if data is too large (localStorage limit is typically 5-10MB)
        if (dataSize > 4 * 1024 * 1024) { // 4MB threshold
          logger.warn('Session data is large, but saving without images');
        }
        
        localStorage.setItem('bulk-upload-session', dataString);
      } catch (error) {
        logger.error('Error saving to localStorage:', error);
        // If storage is full, try to clear old data and retry
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          try {
            // Clear old session data and try again with just essential data
            localStorage.removeItem('bulk-upload-session');
            const minimalData = {
              recitations: recitations.map(r => ({
                id: r.id,
                pageNumber: r.pageNumber,
                title: r.title,
                selected: r.selected,
                customTitle: r.customTitle,
                groupId: r.groupId,
              })),
              groups,
              metadata,
              pdfFileName: pdfFile?.name,
              pdfFileSize: pdfFile?.size,
              timestamp: Date.now(),
            };
            localStorage.setItem('bulk-upload-session', JSON.stringify(minimalData));
            toast({
              title: 'Storage Optimized',
              description: 'Session saved with essential data only. Images will need to be re-extracted.',
              variant: 'default',
            });
          } catch (retryError) {
            toast({
              title: 'Storage Full',
              description: 'Could not save session data. Please save your work soon or clear browser storage.',
              variant: 'destructive',
            });
          }
        }
      }
    }
  }, [recitations, groups, metadata, pdfFile]);

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
      
      // Recreate blobs from data URLs for any existing recitations that don't have blobs
      const existingRecitations = recitations.map((r) => {
        if (!r.imageBlob && r.imageDataUrl) {
          try {
            // Convert data URL back to blob
            const parts = r.imageDataUrl.split(',');
            if (parts.length !== 2) {
              logger.warn('Invalid dataUrl format for recitation:', r.id);
              return r;
            }
            const byteString = atob(parts[1]);
            const mimeString = parts[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            return { ...r, imageBlob: blob };
          } catch (error) {
            logger.error('Error recreating blob from dataUrl:', error);
            return r;
          }
        }
        return r;
      });
      
      // Merge existing with new, avoiding duplicates
      // If we have existing recitations from localStorage (without images), merge their metadata
      const existingPageNumbers = new Set(existingRecitations.map(r => r.pageNumber));
      const newRecitations = extracted.filter(e => !existingPageNumbers.has(e.pageNumber));
      
      // For existing recitations, update them with new image data if available
      const mergedRecitations = existingRecitations.map(existing => {
        const extractedMatch = extracted.find(e => e.pageNumber === existing.pageNumber);
        if (extractedMatch) {
          // Update existing with new image data
          return {
            ...existing,
            imageDataUrl: extractedMatch.imageDataUrl,
            imageBlob: extractedMatch.imageBlob,
          };
        }
        return existing;
      });
      
      setRecitations([...mergedRecitations, ...newRecitations]);
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

        // Upload ALL images from the group
        const imageUrls: string[] = [];
        
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

          try {
            const imageFile = new File([imageBlob], `group-${group.id}-page-${rec.pageNumber}.jpg`, {
              type: 'image/jpeg',
            });

            const { optimizeRecitationImage } = await import('@/lib/image-optimizer');
            const optimizedBlob = await optimizeRecitationImage(imageFile);
            
            const fileName = `bulk-upload-group-${Date.now()}-${group.id}-page-${rec.pageNumber}.webp`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('piece-images')
              .upload(fileName, optimizedBlob, {
                cacheControl: '31536000',
                upsert: false,
                contentType: 'image/webp',
              });

            if (uploadError) {
              logger.error('Error uploading group image:', uploadError);
              continue;
            }

            if (!uploadData?.path) {
              logger.error('Group image upload succeeded but no path returned');
              continue;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('piece-images')
              .getPublicUrl(uploadData.path);
            
            imageUrls.push(publicUrl);
          } catch (imgError: any) {
            logger.error('Error processing group image:', imgError);
            continue;
          }
        }

        if (imageUrls.length === 0) {
          toast({
            title: 'Error',
            description: `Failed to upload images for group: ${group.name}`,
            variant: 'destructive',
          });
          continue;
        }

        // Create one piece for the group with all image URLs (comma-separated)
        const pageNumbers = groupRecitations.map(r => r.pageNumber).sort((a, b) => a - b);
        piecesToInsert.push({
          title: group.name.trim(),
          category_id: metadata.category_id,
          imam_id: metadata.imam_id || null,
          reciter: metadata.reciter || null,
          language: metadata.language,
          video_url: metadata.video_url || null,
          text_content: `Recitation from PDF pages ${pageNumbers.join(', ')}. Contains ${imageUrls.length} image(s).`,
          image_url: imageUrls.join(','), // Store multiple URLs as comma-separated
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

      // Clear localStorage after successful save
      try {
        localStorage.removeItem('bulk-upload-session');
      } catch (error) {
        logger.error('Error clearing localStorage:', error);
      }

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
                  <br />
                  <span className="text-xs text-muted-foreground/80 mt-1 block">
                    💾 Your selections and groups are automatically saved. If you refresh, re-upload the PDF to restore images.
                  </span>
                </p>
              </div>
              {recitations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Clear all saved work? This cannot be undone.')) {
                      localStorage.removeItem('bulk-upload-session');
                      setRecitations([]);
                      setGroups([]);
                      setPdfFile(null);
                      setSelectedCount(0);
                      setMetadata({
                        category_id: metadata.category_id,
                        imam_id: '',
                        reciter: '',
                        language: 'Urdu',
                        video_url: '',
                      });
                      toast({
                        title: 'Session Cleared',
                        description: 'All saved work has been cleared',
                      });
                    }
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Session
                </Button>
              )}
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
                    className="cursor-pointer"
                  />
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

          {/* Metadata Form */}
          {recitations.length > 0 && (
            <Card>
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
                    className={`cursor-pointer transition-all ${
                      isGrouped
                        ? 'opacity-50 grayscale-[0.3] border-dashed'
                        : recitation.selected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => !isGrouped && toggleRecitationSelection(recitation.id)}
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
                        className="w-full rounded-lg overflow-hidden border bg-muted cursor-pointer"
                        style={{ height: '320px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (recitation.imageDataUrl) {
                            const allImages = recitations
                              .filter(r => r.imageDataUrl)
                              .map(r => r.imageDataUrl);
                            const imageIndex = allImages.indexOf(recitation.imageDataUrl);
                            setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
                            setImageViewerOpen(true);
                          }
                        }}
                      >
                        {recitation.imageDataUrl ? (
                          <img
                            src={recitation.imageDataUrl}
                            alt={`Page ${recitation.pageNumber}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                            style={{ objectPosition: 'top center' }}
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
                      
                      {!isGrouped && (
                        <div
                          className="space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Label className="text-xs">Custom Title (optional)</Label>
                          <Input
                            value={recitation.customTitle || ''}
                            onChange={(e) => updateRecitationTitle(recitation.id, e.target.value)}
                            placeholder={recitation.title}
                            className="h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Page {recitation.pageNumber}
                        {isGrouped && group && (
                          <span className="ml-2 text-primary">• Grouped with {group.recitationIds.length} pages</span>
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

      {/* Fullscreen Image Viewer */}
      {imageViewerOpen && recitations.some(r => r.imageDataUrl) && (
        <FullscreenImageViewer
          src={recitations.find(r => r.imageDataUrl)?.imageDataUrl || ''}
          alt={`Page ${recitations[currentImageIndex]?.pageNumber || 1}`}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          images={recitations.filter(r => r.imageDataUrl).map(r => r.imageDataUrl)}
          currentIndex={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
        />
      )}
    </div>
  );
}

