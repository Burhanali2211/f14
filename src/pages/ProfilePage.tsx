import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useUserRole } from '@/hooks/use-user-role';
import { saveSession } from '@/lib/auth-utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { User as UserType } from '@/lib/auth-utils';

// Import refactored components
import {
  PersonalInfoCard,
  AccountInfoCard,
  RoleCard,
  QuickLinksCard,
  QuickAccessGrid,
  ProfileHeader,
  ProfileLoadingSkeleton,
  MyQuestionsCard,
  type ProfileFormData,
} from '@/components/user';


export default function ProfilePage() {
  const { user, role, refresh, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
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

  const getRoleBadgeVariant = (userRole: string): 'destructive' | 'default' | 'secondary' => {
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
    return <ProfileLoadingSkeleton />;
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 flex-1 max-w-4xl pb-24 md:pb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Quick Access Grid */}
        <QuickAccessGrid role={role} />

        {/* Profile Header */}
        <ProfileHeader
          isEditing={isEditing}
          loading={loading}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onSave={handleSave}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <PersonalInfoCard
              user={user}
              formData={formData}
              isEditing={isEditing}
              onFormChange={setFormData}
            />

<AccountInfoCard 
                user={user} 
                formatDate={formatDate} 
              />

              <MyQuestionsCard userId={user.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RoleCard
              role={role}
              getRoleBadgeVariant={getRoleBadgeVariant}
              getRoleLabel={getRoleLabel}
            />

            <QuickLinksCard role={role} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
