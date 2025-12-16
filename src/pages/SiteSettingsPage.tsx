import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, Sparkles, Eye, ChevronLeft } from 'lucide-react';
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
import { optimizeLogoImage, optimizeHeroImage, formatFileSize } from '@/lib/image-optimizer';
import type { SiteSettings } from '@/lib/supabase-types';

export default function SiteSettingsPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading, user: currentUser, refresh: refreshRole } = useUserRole();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  // Site Settings Form State
  const [siteSettingsForm, setSiteSettingsForm] = useState({
    site_name: 'Kalam Reader',
    site_tagline: 'islamic poetry',
    logo_url: '/main.png',
    hero_image_url: '',
    hero_gradient_opacity: 1.0,
    hero_image_opacity: 1.0,
    hero_gradient_preset: 'default' as 'default' | 'emerald' | 'gold' | 'purple' | 'blue' | 'minimal' | 'none',
    hero_badge_text: 'Your Spiritual Companion',
    hero_heading_line1: 'Discover the Beauty of',
    hero_heading_line2: 'islamic poetry',
    hero_description: 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.',
    hero_text_color_mode: 'auto' as 'auto' | 'light' | 'dark',
  });

  // Helper function to get gradient styles based on preset
  const getGradientStyles = (preset: string, opacity: number = 1.0) => {
    const baseOpacity = opacity;
    switch (preset) {
      case 'emerald':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(162 70% 24% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(160 55% 35% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(162 70% 24% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'gold':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(38 90% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(40 75% 62% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(36 85% 40% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'purple':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(270 70% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(280 60% 55% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(260 75% 45% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'blue':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(210 70% 50% / ${baseOpacity * 0.15}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(200 60% 55% / ${baseOpacity * 0.1}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(220 75% 45% / ${baseOpacity * 0.08}), transparent)
        `;
      case 'minimal':
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(0 0% 0% / ${baseOpacity * 0.05}), transparent)
        `;
      case 'none':
        return 'none';
      case 'default':
      default:
        return `
          radial-gradient(ellipse 100% 60% at 50% -10%, hsl(var(--primary) / ${baseOpacity * 0.12}), transparent),
          radial-gradient(ellipse 70% 50% at 85% 50%, hsl(var(--accent) / ${baseOpacity * 0.08}), transparent),
          radial-gradient(ellipse 60% 40% at 15% 70%, hsl(var(--primary) / ${baseOpacity * 0.05}), transparent)
        `;
    }
  };

  // Helper function to detect if image is dark (for auto text color)
  const [imageIsDark, setImageIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (siteSettingsForm.hero_image_url && siteSettingsForm.hero_text_color_mode === 'auto') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let brightness = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              brightness += (r * 299 + g * 587 + b * 114) / 1000;
            }
            brightness = brightness / (data.length / 4);
            setImageIsDark(brightness < 128);
          }
        } catch (e) {
          setImageIsDark(false);
        }
      };
      img.onerror = () => setImageIsDark(false);
      img.src = siteSettingsForm.hero_image_url;
    } else {
      setImageIsDark(null);
    }
  }, [siteSettingsForm.hero_image_url, siteSettingsForm.hero_text_color_mode]);

  // Determine text color class based on mode
  const getTextColorClass = () => {
    if (siteSettingsForm.hero_text_color_mode === 'auto') {
      return imageIsDark ? 'text-white' : 'text-foreground';
    }
    return siteSettingsForm.hero_text_color_mode === 'light' ? 'text-white' : 'text-foreground';
  };

  useEffect(() => {
    checkAuth();
  }, [currentRole, roleLoading, currentUser]);

  useEffect(() => {
    if (currentRole === 'admin') {
      fetchSiteSettings();
    }
  }, [currentRole]);

  const checkAuth = async () => {
    if (roleLoading) return;

    // Check custom auth session first
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // Security: Refresh role from database to get latest role changes
    await refreshRole();
    
    // Get refreshed role - fetch directly from DB to verify
    const { data: userData, error: roleError } = await safeQuery(async () => {
      return await (supabase as any)
        .from('users')
        .select('role, is_active')
        .eq('id', currentUser.id)
        .eq('is_active', true)
        .single();
    });

    // Security: If we can't verify the role from DB, deny access
    if (roleError || !userData) {
      logger.error('SiteSettingsPage: Could not verify user role from database', { error: roleError });
      toast({
        title: 'Access Denied',
        description: 'Unable to verify permissions. Please try again.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    // Security: Verify user ID matches
    if (userData.id && userData.id !== currentUser.id) {
      logger.error('SiteSettingsPage: User ID mismatch - potential security issue', {
        sessionId: currentUser.id,
        dbId: userData.id
      });
      navigate('/auth');
      return;
    }

    const actualRole = userData?.role || currentRole;

    // Security: Strict role check - only 'admin' role allowed
    if (actualRole !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  };

  const fetchSiteSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await safeQuery(async () =>
        await supabase
          .from('site_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000000')
          .maybeSingle()
      );

      if (error) {
        logger.error('Error fetching site settings:', error);
      } else if (data) {
        const settings = data as SiteSettings;
        setSiteSettings(settings);
        setSiteSettingsForm({
          site_name: settings.site_name,
          site_tagline: settings.site_tagline || 'islamic poetry',
          logo_url: settings.logo_url || '/main.png',
          hero_image_url: settings.hero_image_url || '',
          hero_gradient_opacity: settings.hero_gradient_opacity ?? 1.0,
          hero_image_opacity: settings.hero_image_opacity ?? 1.0,
          hero_gradient_preset: (settings.hero_gradient_preset || 'default') as 'default' | 'emerald' | 'gold' | 'purple' | 'blue' | 'minimal' | 'none',
          hero_badge_text: settings.hero_badge_text || 'Your Spiritual Companion',
          hero_heading_line1: settings.hero_heading_line1 || 'Discover the Beauty of',
          hero_heading_line2: settings.hero_heading_line2 || 'islamic poetry',
          hero_description: settings.hero_description || 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.',
          hero_text_color_mode: (settings.hero_text_color_mode || 'auto') as 'auto' | 'light' | 'dark',
        });
      }
    } catch (error) {
      logger.error('Unexpected error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return null;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)',
        variant: 'destructive',
      });
      return null;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'File too large. Maximum size is 10MB',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);
    try {
      logger.debug('Optimizing logo/site image', {
        originalSize: formatFileSize(file.size),
        fileName: file.name,
      });

      // Optimize logo/site images for performance
      const optimizedBlob = await optimizeLogoImage(file);
      logger.debug('Logo image optimized', {
        optimizedSize: formatFileSize(optimizedBlob.size),
        reduction: `${Math.round((1 - optimizedBlob.size / file.size) * 100)}%`,
      });

      const fileName = `site-${Date.now()}.webp`;

      logger.debug('Uploading optimized logo image:', { fileName, size: optimizedBlob.size });

      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) {
        logger.error('Image upload error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
        return null;
      }

      if (!data?.path) {
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

      return publicUrl;
    } catch (error: any) {
      logger.error('Unexpected error during image upload:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during upload',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleHeroImageUpload = async (file: File) => {
    if (!file) return null;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Invalid file type. Please upload an image (JPEG, PNG, WebP, or GIF)',
        variant: 'destructive',
      });
      return null;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Error',
        description: 'File too large. Maximum size is 10MB',
        variant: 'destructive',
      });
      return null;
    }

    setUploading(true);
    try {
      logger.debug('Optimizing hero image', {
        originalSize: formatFileSize(file.size),
        fileName: file.name,
      });

      // Optimize hero images - larger but still optimized
      const optimizedBlob = await optimizeHeroImage(file);
      logger.debug('Hero image optimized', {
        optimizedSize: formatFileSize(optimizedBlob.size),
        reduction: `${Math.round((1 - optimizedBlob.size / file.size) * 100)}%`,
      });

      const fileName = `hero-${Date.now()}.webp`;

      logger.debug('Uploading optimized hero image:', { fileName, size: optimizedBlob.size });

      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000', // 1 year cache
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) {
        logger.error('Hero image upload error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
        return null;
      }

      if (!data?.path) {
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

      return publicUrl;
    } catch (error: any) {
      logger.error('Unexpected error during hero image upload:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during upload',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!siteSettingsForm.site_name.trim()) {
      toast({
        title: 'Error',
        description: 'Site name is required',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('site_settings')
      .update({
        site_name: siteSettingsForm.site_name.trim(),
        site_tagline: siteSettingsForm.site_tagline?.trim() || null,
        logo_url: siteSettingsForm.logo_url?.trim() || null,
        hero_image_url: siteSettingsForm.hero_image_url?.trim() || null,
        hero_gradient_opacity: siteSettingsForm.hero_gradient_opacity ?? 1.0,
        hero_image_opacity: siteSettingsForm.hero_image_opacity ?? 1.0,
        hero_gradient_preset: siteSettingsForm.hero_gradient_preset || 'default',
        hero_badge_text: siteSettingsForm.hero_badge_text?.trim() || null,
        hero_heading_line1: siteSettingsForm.hero_heading_line1?.trim() || null,
        hero_heading_line2: siteSettingsForm.hero_heading_line2?.trim() || null,
        hero_description: siteSettingsForm.hero_description?.trim() || null,
        hero_text_color_mode: siteSettingsForm.hero_text_color_mode || 'auto',
      })
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Site settings updated successfully',
      });
      fetchSiteSettings();
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your site branding, hero section, and appearance
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Site Branding</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              Customize your site name, tagline, and logo. Changes will appear in the header.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="site-name">Site Name</Label>
              <Input
                id="site-name"
                value={siteSettingsForm.site_name}
                onChange={(e) => setSiteSettingsForm(f => ({ ...f, site_name: e.target.value }))}
                placeholder="Kalam Reader"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will appear in the header on all pages
              </p>
            </div>

            <div>
              <Label htmlFor="site-tagline">Site Tagline</Label>
              <Input
                id="site-tagline"
                value={siteSettingsForm.site_tagline}
                onChange={(e) => setSiteSettingsForm(f => ({ ...f, site_tagline: e.target.value }))}
                placeholder="islamic poetry"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A short description that appears below the site name
              </p>
            </div>

            <div>
              <Label htmlFor="logo-url">Logo URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="logo-url"
                  value={siteSettingsForm.logo_url}
                  onChange={(e) => setSiteSettingsForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="/main.png"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await handleImageUpload(file);
                    if (url) {
                      setSiteSettingsForm(f => ({ ...f, logo_url: url }));
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL to your logo image. Can be a local path (e.g., /main.png) or a full URL
              </p>
              {siteSettingsForm.logo_url && (
                <div className="mt-2">
                  <img
                    src={siteSettingsForm.logo_url}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain rounded-lg border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="hero-image-url">Hero Section Background Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                This image will appear behind the gradient on the homepage hero section
              </p>
              <div className="flex gap-2 mt-1">
                <Input
                  id="hero-image-url"
                  value={siteSettingsForm.hero_image_url}
                  onChange={(e) => setSiteSettingsForm(f => ({ ...f, hero_image_url: e.target.value }))}
                  placeholder="/hero-image.jpg"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => heroImageInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <input
                ref={heroImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await handleHeroImageUpload(file);
                    if (url) {
                      setSiteSettingsForm(f => ({ ...f, hero_image_url: url }));
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL to your hero section background image. Can be a local path or a full URL
              </p>
              {siteSettingsForm.hero_image_url && (
                <div className="mt-2">
                  <img
                    src={siteSettingsForm.hero_image_url}
                    alt="Hero image preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {siteSettingsForm.hero_image_url && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <Label htmlFor="hero-gradient-opacity">
                    Gradient Overlay Opacity: {Math.round((siteSettingsForm.hero_gradient_opacity || 1.0) * 100)}%
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Control how visible the gradient overlay is on top of the image (0% = transparent, 100% = fully opaque)
                  </p>
                  <Slider
                    id="hero-gradient-opacity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[siteSettingsForm.hero_gradient_opacity || 1.0]}
                    onValueChange={(value) => setSiteSettingsForm(f => ({ ...f, hero_gradient_opacity: value[0] }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="hero-image-opacity">
                    Background Image Opacity: {Math.round((siteSettingsForm.hero_image_opacity || 1.0) * 100)}%
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Control how visible the background image is (0% = transparent, 100% = fully opaque)
                  </p>
                  <Slider
                    id="hero-image-opacity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[siteSettingsForm.hero_image_opacity || 1.0]}
                    onValueChange={(value) => setSiteSettingsForm(f => ({ ...f, hero_image_opacity: value[0] }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="hero-gradient-preset">Gradient Style</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose a gradient overlay style that complements your image
                  </p>
                  <Select
                    value={siteSettingsForm.hero_gradient_preset}
                    onValueChange={(value) => setSiteSettingsForm(f => ({ ...f, hero_gradient_preset: value as any }))}
                  >
                    <SelectTrigger id="hero-gradient-preset" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Emerald & Gold)</SelectItem>
                      <SelectItem value="emerald">Emerald Green</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="minimal">Minimal (Subtle)</SelectItem>
                      <SelectItem value="none">None (No Gradient)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Hero Section Text</Label>
                    <p className="text-xs text-muted-foreground mb-4">
                      Customize the text content displayed in the hero section
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="hero-badge-text">Badge Text</Label>
                    <Input
                      id="hero-badge-text"
                      value={siteSettingsForm.hero_badge_text}
                      onChange={(e) => setSiteSettingsForm(f => ({ ...f, hero_badge_text: e.target.value }))}
                      placeholder="Your Spiritual Companion"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-heading-line1">Heading Line 1</Label>
                    <Input
                      id="hero-heading-line1"
                      value={siteSettingsForm.hero_heading_line1}
                      onChange={(e) => setSiteSettingsForm(f => ({ ...f, hero_heading_line1: e.target.value }))}
                      placeholder="Discover the Beauty of"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-heading-line2">Heading Line 2 (Gradient Text)</Label>
                    <Input
                      id="hero-heading-line2"
                      value={siteSettingsForm.hero_heading_line2}
                      onChange={(e) => setSiteSettingsForm(f => ({ ...f, hero_heading_line2: e.target.value }))}
                      placeholder="islamic poetry"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-description">Description</Label>
                    <Textarea
                      id="hero-description"
                      value={siteSettingsForm.hero_description}
                      onChange={(e) => setSiteSettingsForm(f => ({ ...f, hero_description: e.target.value }))}
                      placeholder="Explore Naat, Manqabat, Noha, Dua, Marsiya, and more..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="hero-text-color-mode">Text Color Mode</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Auto mode detects image brightness and adjusts text color for best readability
                    </p>
                    <Select
                      value={siteSettingsForm.hero_text_color_mode}
                      onValueChange={(value) => setSiteSettingsForm(f => ({ ...f, hero_text_color_mode: value as any }))}
                    >
                      <SelectTrigger id="hero-text-color-mode" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (Detect from Image)</SelectItem>
                        <SelectItem value="light">Light Text (White)</SelectItem>
                        <SelectItem value="dark">Dark Text (Default)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview Section */}
            {siteSettingsForm.hero_image_url && (
              <div className="pt-4 border-t border-border">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base font-semibold">Live Preview</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    See how your hero section will look on the homepage. Adjust the sliders above to see changes in real-time.
                  </p>
                </div>

                {/* Preview Hero Section */}
                <div className="relative overflow-hidden rounded-lg border-2 border-border shadow-lg" style={{ minHeight: '400px' }}>
                  <div
                    className={`absolute inset-0 ${!siteSettingsForm.hero_image_url ? 'hero-pattern' : ''}`}
                    style={siteSettingsForm.hero_image_url && siteSettingsForm.hero_gradient_preset !== 'none' ? {
                      backgroundImage: getGradientStyles(siteSettingsForm.hero_gradient_preset || 'default', siteSettingsForm.hero_gradient_opacity || 1.0),
                      backgroundSize: siteSettingsForm.hero_gradient_preset === 'minimal' ? 'cover' : 'cover, cover, cover',
                      backgroundPosition: 'center, center, center',
                      backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
                    } : siteSettingsForm.hero_image_url ? {} : undefined}
                  >
                    {siteSettingsForm.hero_image_url && (
                      <div
                        className="absolute inset-0 z-0"
                        style={{
                          backgroundImage: `url(${siteSettingsForm.hero_image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          opacity: siteSettingsForm.hero_image_opacity || 1.0,
                        }}
                      />
                    )}
                  </div>

                  {/* Preview Content */}
                  <div className={`relative z-10 px-6 py-12 text-center ${getTextColorClass()}`}>
                    <div className="max-w-2xl mx-auto">
                      {/* Badge */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm border border-border/50 shadow-soft text-xs mb-6 ${
                        getTextColorClass().includes('white') ? 'bg-black/30' : 'bg-card/90'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className={getTextColorClass().includes('white') ? 'text-white/90' : 'text-muted-foreground'}>
                          {siteSettingsForm.hero_badge_text || 'Your Spiritual Companion'}
                        </span>
                        <Sparkles className="w-3 h-3 text-accent" />
                      </div>

                      {/* Heading */}
                      <h2 className={`text-2xl md:text-3xl font-bold mb-4 leading-tight ${getTextColorClass()}`}>
                        {siteSettingsForm.hero_heading_line1 || 'Discover the Beauty of'}
                        <span className="block text-gradient mt-1">
                          {siteSettingsForm.hero_heading_line2 || 'islamic poetry'}
                        </span>
                      </h2>

                      {/* Description */}
                      <p className={`text-sm md:text-base max-w-xl mx-auto leading-relaxed ${
                        getTextColorClass().includes('white') ? 'text-white/90' : 'text-muted-foreground'
                      }`}>
                        {siteSettingsForm.hero_description || 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleSave}
                className="w-full sm:w-auto"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
