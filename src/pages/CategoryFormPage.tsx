import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Upload, ImageIcon, Loader2, Settings } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { optimizeCategoryBgImage, validateImageFile, formatFileSize } from '@/lib/image-optimizer';
import type { Category } from '@/lib/supabase-types';

// Gradient map for preview
const gradientMap: Record<string, string> = {
  heart: 'from-rose-500/15 to-pink-500/5',
  star: 'from-amber-500/15 to-yellow-500/5',
  droplet: 'from-blue-500/15 to-cyan-500/5',
  hand: 'from-emerald-500/15 to-teal-500/5',
  moon: 'from-violet-500/15 to-purple-500/5',
  users: 'from-orange-500/15 to-amber-500/5',
  book: 'from-primary/15 to-emerald-light/5',
};

export default function CategoryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { role, loading: roleLoading, user: currentUser } = useUserRole();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);
  const categoryImageInputRef = useRef<HTMLInputElement>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'book',
    bg_image_url: '',
    bg_image_position: 'center' as 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    bg_image_size: 'cover' as 'cover' | 'contain' | 'auto',
    bg_image_opacity: 0.3,
    bg_image_blur: 8,
    bg_image_scale: 1.1,
  });

  useEffect(() => {
    checkAuth();
  }, [role, roleLoading]);

  useEffect(() => {
    if (role === 'admin' && isEditing && id) {
      fetchCategory();
    } else if (role === 'admin' && !isEditing) {
      setLoading(false);
    }
  }, [role, id, isEditing]);

  const checkAuth = async () => {
    if (roleLoading) return;

    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only admins can manage categories.',
        variant: 'destructive',
      });
      navigate('/admin');
      return;
    }
  };

  const fetchCategory = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .maybeSingle()
      );

      if (error) {
        logger.error('Error fetching category:', error);
        toast({
          title: 'Error',
          description: 'Failed to load category',
          variant: 'destructive',
        });
        navigate('/admin');
        return;
      }

      if (!data) {
        toast({
          title: 'Error',
          description: 'Category not found',
          variant: 'destructive',
        });
        navigate('/admin');
        return;
      }

      const category = data as Category;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CategoryFormPage.tsx:127',message:'Category data received, setting form',data:{name:category.name,slug:category.slug,icon:category.icon,hasDescription:!!category.description},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        icon: category.icon || 'book',
        bg_image_url: category.bg_image_url || '',
        bg_image_position: (category.bg_image_position || 'center') as any,
        bg_image_size: (category.bg_image_size || 'cover') as any,
        bg_image_opacity: category.bg_image_opacity ?? 0.3,
        bg_image_blur: category.bg_image_blur ?? 8,
        bg_image_scale: category.bg_image_scale ?? 1.1,
      });
      setCategoryImagePreview(category.bg_image_url || null);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CategoryFormPage.tsx:140',message:'Form state updated',data:{name:category.name,slug:category.slug,icon:category.icon||'book'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      logger.error('Unexpected error fetching category:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: 'Error',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    setCategoryImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCategoryImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadCategoryImage = async (): Promise<string | null> => {
    if (!categoryImageFile) return null;

    setUploadingImage(true);
    try {
      logger.debug('Optimizing category background image', {
        originalSize: formatFileSize(categoryImageFile.size),
        fileName: categoryImageFile.name,
      });

      const optimizedBlob = await optimizeCategoryBgImage(categoryImageFile);
      logger.debug('Image optimized', {
        optimizedSize: formatFileSize(optimizedBlob.size),
        reduction: `${Math.round((1 - optimizedBlob.size / categoryImageFile.size) * 100)}%`,
      });

      const fileName = `category-bg-${Date.now()}.webp`;

      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) {
        logger.error('Category image upload error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to upload image',
          variant: 'destructive',
        });
        return null;
      }

      if (!data?.path) {
        logger.error('Upload succeeded but no path returned');
        toast({
          title: 'Error',
          description: 'Upload succeeded but failed to get image URL',
          variant: 'destructive',
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data.path);

      console.log('✅ Image uploaded successfully!');
      console.log('  - File path:', data.path);
      console.log('  - Public URL:', publicUrl);
      logger.debug('Got public URL for uploaded image:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      logger.error('Unexpected error during category image upload:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!categoryForm.name || !categoryForm.slug) {
      toast({
        title: 'Error',
        description: 'Name and slug are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Upload image if a new one was selected
      let bgImageUrl = categoryForm.bg_image_url;
      console.log('📤 Image upload check:', {
        hasFile: !!categoryImageFile,
        hasExistingUrl: !!categoryForm.bg_image_url,
        existingUrl: categoryForm.bg_image_url
      });
      
      if (categoryImageFile) {
        console.log('🔄 Starting image upload...');
        logger.debug('Uploading new category image...');
        const uploadedUrl = await uploadCategoryImage();
        if (uploadedUrl) {
          bgImageUrl = uploadedUrl;
          console.log('✅ Image upload complete! URL:', uploadedUrl);
          logger.debug('Image uploaded successfully, URL:', uploadedUrl);
        } else {
          console.error('❌ Image upload failed - no URL returned');
          logger.error('Image upload failed');
          toast({
            title: 'Error',
            description: 'Failed to upload image. Please try again.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      } else if (categoryForm.bg_image_url) {
        // Keep existing image URL if no new file selected
        bgImageUrl = categoryForm.bg_image_url;
        console.log('ℹ️ Using existing image URL:', bgImageUrl);
        logger.debug('Using existing image URL:', bgImageUrl);
      } else {
        console.log('ℹ️ No image to upload or use');
      }

      const data = {
        name: categoryForm.name,
        slug: categoryForm.slug.toLowerCase().replace(/\s+/g, '-'),
        description: categoryForm.description || null,
        icon: categoryForm.icon,
        bg_image_url: bgImageUrl || null,
        bg_image_position: categoryForm.bg_image_position,
        bg_image_size: categoryForm.bg_image_size,
        bg_image_opacity: categoryForm.bg_image_opacity,
        bg_image_blur: categoryForm.bg_image_blur,
        bg_image_scale: categoryForm.bg_image_scale,
      };

      // Log the actual data being saved
      console.log('💾 Saving category with data:', {
        name: data.name,
        slug: data.slug,
        bg_image_url: bgImageUrl || 'NULL - NO IMAGE URL',
        bg_image_position: data.bg_image_position,
        bg_image_opacity: data.bg_image_opacity,
        bg_image_blur: data.bg_image_blur,
        bg_image_scale: data.bg_image_scale,
        fullData: data
      });
      
      logger.debug('Saving category with data:', { 
        name: data.name,
        slug: data.slug,
        bg_image_url: bgImageUrl ? `URL: ${bgImageUrl.substring(0, 50)}...` : 'No URL',
        bg_image_position: data.bg_image_position,
        bg_image_opacity: data.bg_image_opacity,
        bg_image_blur: data.bg_image_blur,
      });

      if (isEditing && id) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', id);

        if (error) {
          logger.error('Error updating category:', error);
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
        
        // Verify the update by fetching the category
        const { data: verifyData } = await supabase
          .from('categories')
          .select('bg_image_url')
          .eq('id', id)
          .single();
        
        logger.debug('Category updated successfully. Image URL saved:', verifyData?.bg_image_url);
        console.log('✅ Category saved with image URL:', verifyData?.bg_image_url || 'NO URL');
        toast({
          title: 'Success',
          description: 'Category updated successfully',
        });
      } else {
        const { error, data: insertedData } = await supabase
          .from('categories')
          .insert([data])
          .select('id, bg_image_url');

        if (error) {
          logger.error('Error creating category:', error);
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
        
        const savedCategory = Array.isArray(insertedData) ? insertedData[0] : insertedData;
        logger.debug('Category created successfully. Image URL saved:', savedCategory?.bg_image_url);
        console.log('✅ Category created with image URL:', savedCategory?.bg_image_url || 'NO URL');
        toast({
          title: 'Success',
          description: 'Category created successfully',
        });
      }

      navigate('/admin');
    } catch (error: any) {
      logger.error('Unexpected error saving category:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  const positionMap: Record<string, string> = {
    'center': 'center',
    'top': 'center top',
    'bottom': 'center bottom',
    'left': 'left center',
    'right': 'right center',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom',
  };
  const objectPosition = positionMap[categoryForm.bg_image_position] || 'center';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isEditing ? 'Edit Category' : 'Add Category'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditing ? 'Update category details and settings' : 'Create a new category for organizing content'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl shadow-soft p-6 md:p-8 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
              
              <div>
                <Label htmlFor="cat-name">Name *</Label>
                <Input
                  id="cat-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Naat"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cat-slug">Slug *</Label>
                <Input
                  id="cat-slug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g., naat"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL-friendly identifier (auto-generated from name)
                </p>
              </div>

              <div>
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this category..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="cat-icon">Icon</Label>
                <Select
                  value={categoryForm.icon}
                  onValueChange={(value) => setCategoryForm(f => ({ ...f, icon: value }))}
                >
                  <SelectTrigger id="cat-icon" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="heart">Heart</SelectItem>
                    <SelectItem value="star">Star</SelectItem>
                    <SelectItem value="droplet">Droplet</SelectItem>
                    <SelectItem value="hand">Hand</SelectItem>
                    <SelectItem value="moon">Moon</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                  </SelectContent>
                </Select>
                {/* #region agent log */}
                {(() => {
                  fetch('http://127.0.0.1:7242/ingest/beff2a73-2541-407a-b62e-088f90641c0f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CategoryFormPage.tsx:466',message:'Category form render state',data:{name:categoryForm.name,slug:categoryForm.slug,icon:categoryForm.icon,isEditing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
                  return null;
                })()}
                {/* #endregion */}
              </div>
            </div>

            {/* Background Image */}
            <div className="space-y-4 pt-6 border-t">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Background Image
              </h2>

              <div>
                <Label htmlFor="cat-bg-image">Upload Image (Optional)</Label>
                <div className="mt-2">
                  <input
                    ref={categoryImageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleCategoryImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => categoryImageInputRef.current?.click()}
                    className="w-full"
                    disabled={uploadingImage}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {categoryImageFile ? 'Change Image' : 'Select Image'}
                  </Button>
                  {categoryImageFile && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Selected: {categoryImageFile.name} ({formatFileSize(categoryImageFile.size)})
                    </p>
                  )}
                </div>
              </div>

              {(categoryImagePreview || categoryForm.bg_image_url) && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-2 relative inline-block">
                    <img
                      src={categoryImagePreview || categoryForm.bg_image_url || ''}
                      alt="Preview"
                      className="w-64 h-64 rounded-lg object-cover border-2 border-border"
                    />
                    {categoryImageFile && (
                      <div className="absolute -bottom-2 left-0 right-0 text-center">
                        <span className="text-xs bg-background px-2 py-1 rounded border border-border">
                          Will be optimized to ~800x800px
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Image Display Configuration */}
              {(categoryForm.bg_image_url || categoryImagePreview) && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <h3 className="text-lg font-semibold text-foreground">Display Settings</h3>
                  </div>

                  {/* Position */}
                  <div>
                    <Label htmlFor="cat-bg-position">Image Position</Label>
                    <Select
                      value={categoryForm.bg_image_position}
                      onValueChange={(value: any) => setCategoryForm(f => ({ ...f, bg_image_position: value }))}
                    >
                      <SelectTrigger id="cat-bg-position" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size */}
                  <div>
                    <Label htmlFor="cat-bg-size">Image Size</Label>
                    <Select
                      value={categoryForm.bg_image_size}
                      onValueChange={(value: any) => setCategoryForm(f => ({ ...f, bg_image_size: value }))}
                    >
                      <SelectTrigger id="cat-bg-size" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover (Fill)</SelectItem>
                        <SelectItem value="contain">Contain (Fit)</SelectItem>
                        <SelectItem value="auto">Auto (Original)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Opacity */}
                  <div>
                    <Label htmlFor="cat-bg-opacity">
                      Opacity: {Math.round(categoryForm.bg_image_opacity * 100)}%
                    </Label>
                    <Slider
                      id="cat-bg-opacity"
                      min={0}
                      max={1}
                      step={0.05}
                      value={[categoryForm.bg_image_opacity]}
                      onValueChange={(value) => setCategoryForm(f => ({ ...f, bg_image_opacity: value[0] }))}
                      className="mt-2"
                    />
                  </div>

                  {/* Blur */}
                  <div>
                    <Label htmlFor="cat-bg-blur">
                      Blur: {categoryForm.bg_image_blur}px
                    </Label>
                    <Slider
                      id="cat-bg-blur"
                      min={0}
                      max={20}
                      step={1}
                      value={[categoryForm.bg_image_blur]}
                      onValueChange={(value) => setCategoryForm(f => ({ ...f, bg_image_blur: value[0] }))}
                      className="mt-2"
                    />
                  </div>

                  {/* Scale */}
                  <div>
                    <Label htmlFor="cat-bg-scale">
                      Scale: {categoryForm.bg_image_scale}x
                    </Label>
                    <Slider
                      id="cat-bg-scale"
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={[categoryForm.bg_image_scale]}
                      onValueChange={(value) => setCategoryForm(f => ({ ...f, bg_image_scale: value[0] }))}
                      className="mt-2"
                    />
                  </div>

                  {/* Live Preview - Matches actual CategoryCard */}
                  {(categoryImagePreview || categoryForm.bg_image_url) && (
                    <div>
                      <Label>Live Preview (How it will appear on homepage)</Label>
                      <div className="mt-2 relative w-full rounded-2xl overflow-hidden border-2 border-border bg-card shadow-soft" style={{ aspectRatio: '1 / 1', minHeight: '200px' }}>
                        {/* Background image layer - matches CategoryCard exactly */}
                        <div className="absolute inset-0 overflow-hidden">
                          <img
                            src={categoryImagePreview || categoryForm.bg_image_url || ''}
                            alt="Preview"
                            className="absolute inset-0 w-full h-full transition-opacity duration-500"
                            style={{
                              objectFit: categoryForm.bg_image_size as 'cover' | 'contain' | 'fill',
                              objectPosition: objectPosition,
                              transform: `scale(${categoryForm.bg_image_scale})`,
                              filter: `blur(${categoryForm.bg_image_blur}px)`,
                              opacity: categoryForm.bg_image_opacity,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {/* Gradient overlay - matches CategoryCard */}
                          <div className={`absolute inset-0 bg-gradient-to-br ${gradientMap[categoryForm.icon] || gradientMap.book} opacity-50`} />
                        </div>
                        
                        {/* Content preview - shows how text will appear */}
                        <div className="relative z-10 p-5">
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientMap[categoryForm.icon] || gradientMap.book} flex items-center justify-center mb-4`}>
                            <div className="w-7 h-7 rounded bg-primary/20" />
                          </div>
                          <div className="h-6 bg-foreground/20 rounded mb-2 w-3/4" />
                          <div className="h-4 bg-muted-foreground/20 rounded w-full" />
                        </div>
                        
                        {/* Decorative corner accent - matches CategoryCard */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/10 to-transparent rounded-bl-[80px] opacity-60" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        This preview shows how the category card will appear on the homepage
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                disabled={saving || uploadingImage}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploadingImage || !categoryForm.name || !categoryForm.slug}
                className="min-w-[120px]"
              >
                {saving || uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {uploadingImage ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  isEditing ? 'Update Category' : 'Create Category'
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
