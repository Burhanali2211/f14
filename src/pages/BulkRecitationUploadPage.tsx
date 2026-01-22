import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, Check, X, Loader2, Save, CheckSquare, Square, FileCheck, AlertCircle, Settings2, Plus } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import type { Category, Imam } from '@/lib/supabase-types';
import { ReciterCombobox } from '@/components/ReciterCombobox';
import * as pdfjsLib from 'pdfjs-dist';
import jsPDF from 'jspdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

async function createPDFFromImages(imageBlobs: Blob[]): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < imageBlobs.length; i++) {
    if (i > 0) pdf.addPage();

    const imgData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlobs[i]);
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgData;
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const imgAspectRatio = img.width / img.height;

    let width = maxWidth;
    let height = maxWidth / imgAspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = maxHeight * imgAspectRatio;
    }

    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;
    pdf.addImage(imgData, 'JPEG', x, y, width, height);
  }

  return pdf.output('blob');
}

interface ExtractedPage {
  id: string;
  pageNumber: number;
  imageDataUrl: string;
  imageBlob?: Blob;
  selected: boolean;
  groupId?: string;
}

interface RecitationGroup {
  id: string;
  name: string;
  pageIds: string[];
}

export default function BulkRecitationUploadPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<ExtractedPage[]>([]);
  const [groups, setGroups] = useState<RecitationGroup[]>([]);

  const [metadata, setMetadata] = useState({
    category_id: '',
    imam_id: '',
    reciter: '',
    language: 'Urdu',
    video_url: '',
  });

  const selectedCount = pages.filter(p => p.selected && !p.groupId).length;
  const ungroupedCount = pages.filter(p => !p.groupId).length;

  useEffect(() => {
    if (roleLoading) return;
    if (role !== 'admin' && role !== 'uploader') {
      toast({ title: 'Access Denied', description: 'You need admin or uploader permissions.', variant: 'destructive' });
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
        supabase.from('imams').select('*').order('order_index, name'),
      ]);

      if (catRes.data) {
        setCategories(catRes.data as Category[]);
        if (catRes.data.length > 0 && !metadata.category_id) {
          setMetadata(m => ({ ...m, category_id: catRes.data[0].id }));
        }
      }
      if (imamRes.data) setImams(imamRes.data as Imam[]);
    } catch (error) {
      logger.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPages([]);
      setGroups([]);
    } else {
      toast({ title: 'Invalid File', description: 'Please select a PDF file', variant: 'destructive' });
    }
  };

  const parsePDF = async () => {
    if (!pdfFile) return;
    setParsing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extracted: ExtractedPage[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.85);
        });

        extracted.push({
          id: `page-${pageNum}`,
          pageNumber: pageNum,
          imageDataUrl: canvas.toDataURL('image/jpeg', 0.85),
          imageBlob: blob,
          selected: false,
        });
      }

      setPages(extracted);
      toast({ title: 'Success', description: `Extracted ${extracted.length} page(s)` });
    } catch (error) {
      logger.error('Error parsing PDF:', error);
      toast({ title: 'Error', description: 'Failed to parse PDF', variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const togglePage = useCallback((id: string) => {
    setPages(prev => prev.map(p => p.id === id && !p.groupId ? { ...p, selected: !p.selected } : p));
  }, []);

  const selectAll = useCallback(() => {
    const allSelected = pages.filter(p => !p.groupId).every(p => p.selected);
    setPages(prev => prev.map(p => p.groupId ? p : { ...p, selected: !allSelected }));
  }, [pages]);

  const createGroup = useCallback(() => {
    const selected = pages.filter(p => p.selected && !p.groupId);
    if (selected.length < 1) {
      toast({ title: 'Select Pages', description: 'Select at least 1 page to create a recitation', variant: 'destructive' });
      return;
    }

    const groupId = `group-${Date.now()}`;
    setGroups(prev => [...prev, { id: groupId, name: '', pageIds: selected.map(p => p.id) }]);
    setPages(prev => prev.map(p => selected.some(s => s.id === p.id) ? { ...p, groupId, selected: false } : p));
    toast({ title: 'Group Created', description: `${selected.length} page(s) grouped` });
  }, [pages]);

  const removeGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setPages(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: undefined } : p));
  }, []);

  const updateGroupName = useCallback((groupId: string, name: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));
  }, []);

  const handleSave = async () => {
    const validGroups = groups.filter(g => g.name?.trim());
    if (validGroups.length === 0) {
      toast({ title: 'No Recitations', description: 'Create and name at least one recitation group', variant: 'destructive' });
      return;
    }
    if (!metadata.category_id) {
      toast({ title: 'Missing Category', description: 'Please select a category', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const piecesToInsert = [];

      for (const group of validGroups) {
        const groupPages = pages.filter(p => p.groupId === group.id);
        if (groupPages.length === 0) continue;

        const imageBlobs: Blob[] = [];
        for (const page of groupPages) {
          let blob = page.imageBlob;
          if (!blob && page.imageDataUrl) {
            const parts = page.imageDataUrl.split(',');
            if (parts.length === 2) {
              const byteString = atob(parts[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
              blob = new Blob([ab], { type: 'image/jpeg' });
            }
          }
          if (blob) imageBlobs.push(blob);
        }

        if (imageBlobs.length === 0) continue;

        const imageUrls: string[] = [];
        const maxImages = Math.min(2, imageBlobs.length);

        for (let i = 0; i < maxImages; i++) {
          try {
            const { optimizeRecitationImage } = await import('@/lib/image-optimizer');
            const optimized = await optimizeRecitationImage(new File([imageBlobs[i]], `img-${i}.jpg`, { type: 'image/jpeg' }));
            const fileName = `bulk-${Date.now()}-${group.id}-${i}.webp`;

            const { data, error } = await supabase.storage
              .from('piece-images')
              .upload(fileName, optimized, { cacheControl: '31536000', contentType: 'image/webp' });

            if (error) throw error;
            if (data?.path) {
              const { data: { publicUrl } } = supabase.storage.from('piece-images').getPublicUrl(data.path);
              imageUrls.push(publicUrl);
            }
          } catch (err) {
            logger.error('Image upload error:', err);
          }
        }

        let pdfUrl = '';
        try {
          const pdfBlob = await createPDFFromImages(imageBlobs);
          const pdfName = `bulk-${Date.now()}-${group.id}.pdf`;
          const { data, error } = await supabase.storage
            .from('piece-images')
            .upload(pdfName, pdfBlob, { cacheControl: '31536000', contentType: 'application/pdf' });

          if (!error && data?.path) {
            const { data: { publicUrl } } = supabase.storage.from('piece-images').getPublicUrl(data.path);
            pdfUrl = publicUrl;
          }
        } catch (err) {
          logger.error('PDF creation error:', err);
        }

        // Store as array instead of comma-separated string
        const allUrls = [...imageUrls, pdfUrl].filter(Boolean);
        const pageNums = groupPages.map(p => p.pageNumber).sort((a, b) => a - b);

        piecesToInsert.push({
          title: group.name.trim(),
          category_id: metadata.category_id,
          imam_id: metadata.imam_id || null,
          reciter: metadata.reciter || null,
          language: metadata.language,
          video_url: metadata.video_url || null,
          text_content: `Pages ${pageNums.join(', ')}`,
          image_url: allUrls || null,
          view_count: 0,
        });
      }

      if (piecesToInsert.length === 0) {
        throw new Error('No pieces could be created');
      }

      const { error } = await authenticatedQuery(() => supabase.from('pieces').insert(piecesToInsert).select());
      if (error) throw error;

      toast({ title: 'Success', description: `Saved ${piecesToInsert.length} recitation(s)` });

      const savedGroupIds = new Set(validGroups.map(g => g.id));
      const savedPageIds = new Set(pages.filter(p => p.groupId && savedGroupIds.has(p.groupId)).map(p => p.id));
      setPages(prev => prev.filter(p => !savedPageIds.has(p.id)));
      setGroups(prev => prev.filter(g => !savedGroupIds.has(g.id)));

      if (pages.length === savedPageIds.size) {
        setPdfFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      
      setSheetOpen(false);
    } catch (error: any) {
      logger.error('Save error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
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
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-6 space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
          <ChevronLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <div>
          <h1 className="text-2xl font-bold mb-1">Bulk Recitation Upload</h1>
          <p className="text-muted-foreground text-sm">Upload a PDF, select pages, then tap the button below to group and save.</p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Upload PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                {pdfFile ? pdfFile.name : 'Select PDF'}
              </Button>
              <Button onClick={parsePDF} disabled={!pdfFile || parsing}>
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                {parsing ? 'Parsing...' : 'Parse'}
              </Button>
            </div>
            {pdfFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileCheck className="w-3 h-3" />
                {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pages Grid */}
        {pages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Pages ({pages.length})</h2>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {pages.filter(p => !p.groupId).every(p => p.selected) ? <Square className="w-4 h-4 mr-1" /> : <CheckSquare className="w-4 h-4 mr-1" />}
                {pages.filter(p => !p.groupId).every(p => p.selected) ? 'Deselect' : 'Select'} All
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {pages.map(page => {
                const isGrouped = !!page.groupId;
                const group = groups.find(g => g.id === page.groupId);
                return (
                  <div
                    key={page.id}
                    onClick={() => !isGrouped && togglePage(page.id)}
                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      isGrouped ? 'opacity-50 border-dashed cursor-default' :
                      page.selected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-muted">
                      {page.imageDataUrl ? (
                        <img src={page.imageDataUrl} alt={`Page ${page.pageNumber}`} className="w-full h-full object-cover object-top" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      {!isGrouped && (
                        <Checkbox checked={page.selected} className="bg-background" onClick={e => e.stopPropagation()} />
                      )}
                      {isGrouped && (
                        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1">
                      {isGrouped && group ? (
                        <span className="truncate block">{group.name || 'Unnamed'}</span>
                      ) : (
                        <span>Page {page.pageNumber}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pages.length === 0 && pdfFile && !parsing && (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No pages extracted. Click "Parse" to process the PDF.</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Floating Action Button */}
      {pages.length > 0 && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
              size="icon"
            >
              <div className="relative">
                <Settings2 className="w-6 h-6" />
                {(selectedCount > 0 || groups.length > 0) && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {selectedCount > 0 ? selectedCount : groups.length}
                  </span>
                )}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Details & Grouping</SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Selection Actions */}
              {selectedCount > 0 && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedCount} page(s) selected</p>
                      <p className="text-sm text-muted-foreground">Group these pages into a recitation</p>
                    </div>
                    <Button onClick={createGroup}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                </div>
              )}

              {/* Metadata Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Recitation Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Category *</Label>
                    <Select value={metadata.category_id} onValueChange={v => setMetadata(m => ({ ...m, category_id: v }))}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Figure</Label>
                    <Select value={metadata.imam_id || 'none'} onValueChange={v => setMetadata(m => ({ ...m, imam_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {imams.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Language</Label>
                    <Select value={metadata.language} onValueChange={v => setMetadata(m => ({ ...m, language: v }))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Urdu', 'Kashmiri', 'English', 'Arabic', 'Persian', 'Hinglish'].map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reciter</Label>
                    <ReciterCombobox value={metadata.reciter} onChange={v => setMetadata(m => ({ ...m, reciter: v }))} placeholder="Optional" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">YouTube URL (optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={metadata.video_url}
                    onChange={e => setMetadata(m => ({ ...m, video_url: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Groups Section */}
              {groups.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Recitation Groups ({groups.length})</h3>
                  <div className="space-y-2">
                    {groups.map(group => {
                      const groupPages = pages.filter(p => p.groupId === group.id);
                      const nums = groupPages.map(p => p.pageNumber).sort((a, b) => a - b);
                      return (
                        <div key={group.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                          <span className="text-xs text-muted-foreground min-w-[70px] shrink-0">
                            Page{nums.length > 1 ? 's' : ''} {nums.join(', ')}
                          </span>
                          <Input
                            value={group.name}
                            onChange={e => updateGroupName(group.id, e.target.value)}
                            placeholder="Enter name (required)"
                            className="h-9 flex-1"
                          />
                          <Button variant="ghost" size="sm" onClick={() => removeGroup(group.id)} className="h-9 w-9 p-0 text-destructive shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {groups.length === 0 && selectedCount === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select pages from the grid, then create groups here</p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving || !metadata.category_id || groups.length === 0 || groups.some(g => !g.name?.trim())}
                className="w-full h-12"
                size="lg"
              >
                {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                {saving ? 'Saving...' : `Save ${groups.filter(g => g.name?.trim()).length} Recitation(s)`}
              </Button>
              {groups.length > 0 && groups.some(g => !g.name?.trim()) && (
                <p className="text-xs text-destructive text-center mt-2">All groups must have names</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
