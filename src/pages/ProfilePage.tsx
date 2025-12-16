import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, User, Mail, Phone, MapPin, 
  Calendar, Shield, Settings, Heart, BookOpen,
  Edit2, Check, X, Loader2, Home, Upload, 
  Plus, Bell, FolderOpen, LayoutDashboard
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUserRole } from '@/hooks/use-user-role';
import { getCurrentUser, saveSession } from '@/lib/auth-utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { User as UserType } from '@/lib/auth-utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProfilePage() {
  const { user, role, refresh, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!roleLoading && !user) {
      navigate('/auth');
    }
  }, [user, navigate, roleLoading]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name || null,
          phone_number: formData.phone_number || null,
          address: formData.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (updatedUser) {
        // Update session with new user data
        const { password_hash, ...userWithoutPassword } = updatedUser;
        saveSession(userWithoutPassword as UserType);
      }

      // Refresh user data in context
      await refresh();
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });

      setIsEditing(false);
    } catch (error: any) {
      logger.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'destructive';
      case 'uploader':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case 'admin':
        return 'Administrator';
      case 'uploader':
        return 'Uploader';
      default:
        return 'User';
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-8 flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 flex-1 max-w-4xl">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Quick Links Cards - Mobile Optimized */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Common Links for All Users */}
            <Link
              to="/"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">Browse</span>
            </Link>

            <Link
              to="/favorites"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">Favorites</span>
            </Link>

            <Link
              to="/calendar"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">Calendar</span>
            </Link>

            <Link
              to="/settings"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">Settings</span>
            </Link>

            {/* Uploader Links */}
            {(role === 'uploader' || role === 'admin') && (
              <>
                <Link
                  to="/uploader"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">Upload</span>
                </Link>

                <Link
                  to="/uploader/piece/new"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">New Piece</span>
                </Link>
              </>
            )}

            {/* Admin Links */}
            {role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-2 group-hover:bg-destructive/20 transition-colors">
                    <Shield className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">Admin</span>
                </Link>

                <Link
                  to="/admin/site-settings"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">Site Settings</span>
                </Link>

                <Link
                  to="/admin/announcements"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">Announcements</span>
                </Link>

                <Link
                  to="/admin/category/new"
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border hover:bg-accent hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground text-center">New Category</span>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            My Profile
          </h1>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your account details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      {user.full_name || 'Not provided'}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Email */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <p className="text-foreground font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <Separator />

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      {user.phone_number || 'Not provided'}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Address
                  </Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      {user.address || 'Not provided'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  Details about your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(user.created_at)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(user.updated_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Account Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={getRoleBadgeVariant(role)} className="text-sm py-1.5 px-3">
                  {getRoleLabel(role)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-3">
                  Your role determines what features you can access on the platform.
                </p>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/favorites">
                    <Heart className="w-4 h-4 mr-2" />
                    My Favorites
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link to="/">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Content
                  </Link>
                </Button>
                {role === 'admin' && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/admin">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Link>
                  </Button>
                )}
                {(role === 'uploader' || role === 'admin') && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to="/uploader">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Upload Content
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
