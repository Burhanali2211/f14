import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, Sparkles, Eye, ChevronLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { optimizeLogoImage, optimizeHeroImage } from '@/lib/image-optimizer';
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
    hero_image_opacity: 1.0,
  });

  // Helper function to detect if image is dark (for auto text color)
  const [imageIsDark, setImageIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (siteSettingsForm.hero_image_url) {
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
  }, [siteSettingsForm.hero_image_url]);

  // Determine text color class based on brightness
  const getTextColorClass = () => {
    return imageIsDark ? 'text-white' : 'text-foreground';
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

    if (!currentUser) {
      navigate('/auth');
      return;
    }

    await refreshRole();
    
    const { data: userData, error: roleError } = await safeQuery(async () => {
      return await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', currentUser.id)
        .eq('is_active', true)
        .single();
    });

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

    const actualRole = userData?.role || currentRole;

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
          hero_image_opacity: settings.hero_image_opacity ?? 1.0,
        });
      }
    } catch (error) {
      logger.error('Unexpected error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'hero') => {
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
      const optimizedBlob = type === 'logo' ? await optimizeLogoImage(file) : await optimizeHeroImage(file);
      const fileName = `${type}-${Date.now()}.webp`;

      const { data, error } = await supabase.storage
        .from('piece-images')
        .upload(fileName, optimizedBlob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('piece-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      logger.error(`Error uploading ${type}:`, error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
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

    const updateData = {
      site_name: siteSettingsForm.site_name.trim(),
      site_tagline: siteSettingsForm.site_tagline?.trim() || null,
      logo_url: siteSettingsForm.logo_url?.trim() || null,
      hero_image_url: siteSettingsForm.hero_image_url?.trim() || null,
      hero_image_opacity: siteSettingsForm.hero_image_opacity ?? 1.0,
    };

    const { data: updatedData, error } = await authenticatedQuery(async () => {
      return await supabase
        .from('site_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          ...updateData,
        }, {
          onConflict: 'id'
        })
        .select()
        .single();
    });

    if (error) {
      logger.error('SiteSettings: Error updating settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update site settings',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Site settings updated successfully',
    });
    
    fetchSiteSettings();
    setTimeout(() => window.location.reload(), 1000);
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
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Site Settings</h1>
          <p className="text-muted-foreground mt-2">
            Customize your site branding and homepage hero section
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-4 sm:p-6 space-y-8">
          {/* Site Branding Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Site Branding</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Customize your site name, tagline, and logo
              </p>
            </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    value={siteSettingsForm.site_name}
                    onChange={(e) => setSiteSettingsForm(f => ({ ...f, site_name: e.target.value }))}
                    placeholder="Kalam Reader"
                  />
                </div>
              </div>

            <div className="space-y-2">
              <Label htmlFor="logo-url">Logo</Label>
              <div className="flex gap-2">
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
                  <Upload className="w-4 h-4" />
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
                    const url = await handleImageUpload(file, 'logo');
                    if (url) setSiteSettingsForm(f => ({ ...f, logo_url: url }));
                  }
                }}
              />
              {siteSettingsForm.logo_url && (
                <div className="mt-2 p-2 border rounded-lg w-20 h-20 bg-muted/50">
                  <img
                    src={siteSettingsForm.logo_url}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Hero Section Customization */}
          <section className="space-y-4 pt-8 border-t">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Hero Section</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Change the background image and its intensity
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero-image-url">Background Image</Label>
                <div className="flex gap-2">
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
                    <Upload className="w-4 h-4" />
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
                      const url = await handleImageUpload(file, 'hero');
                      if (url) setSiteSettingsForm(f => ({ ...f, hero_image_url: url }));
                    }
                  }}
                />
              </div>

              {siteSettingsForm.hero_image_url && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Image Intensity: {Math.round(siteSettingsForm.hero_image_opacity * 100)}%</Label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.01}
                      value={[siteSettingsForm.hero_image_opacity]}
                      onValueChange={(value) => setSiteSettingsForm(f => ({ ...f, hero_image_opacity: value[0] }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Preview
                    </Label>
                    <div className="relative overflow-hidden rounded-xl border-2 shadow-inner bg-muted" style={{ minHeight: '250px' }}>
                      <div
                        className="absolute inset-0 transition-opacity duration-300"
                        style={{
                          backgroundImage: `url(${siteSettingsForm.hero_image_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          opacity: siteSettingsForm.hero_image_opacity,
                        }}
                      />
                      <div className={`relative z-10 p-8 text-center flex flex-col items-center justify-center min-h-[250px] ${getTextColorClass()}`}>
                        <div className="max-w-md">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border shadow-sm text-[10px] mb-4 ${
                            imageIsDark ? 'bg-black/30 border-white/20' : 'bg-white/50 border-black/10'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            <span>Your Spiritual Companion</span>
                            <Sparkles className="w-3 h-3 text-accent" />
                          </div>
                            <h3 className="text-xl font-bold mb-2">
                              Discover the Beauty of
                              <span className="block text-gradient">islamic poetry</span>
                            </h3>
                            <div className="mt-2 text-center">
                              <p className="text-lg font-arabic leading-relaxed mb-1" dir="rtl">
                                إِنَّ الْحُسَيْنَ مِصْبَاحُ الْهُدَىٰ وَسَفِينَةُ النَّجَاةِ
                              </p>
                              <p className="text-[10px] uppercase tracking-widest opacity-70">
                                The Lamp of Guidance & The Ship of Salvation
                              </p>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={handleSave}
              className="px-8"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
