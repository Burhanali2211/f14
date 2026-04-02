import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/use-user-role';
import { UploaderMobileBottomNav } from '@/components/uploader/MobileBottomNav';
import { AdminMobileBottomNav } from '@/components/admin/MobileBottomNav';

/**
 * Global Mobile Bottom Navigation Wrapper
 * Shows the appropriate mobile navigation based on user role
 * Hides on piece/recitation viewing pages and dashboard pages (which have their own nav)
 */
export const MobileBottomNavWrapper = () => {
  const location = useLocation();
  const { role, loading } = useUserRole();
  
  // State for navigation sections
  const [uploaderSection, setUploaderSection] = useState<'earnings' | 'recitations'>('earnings');
  const [adminSection, setAdminSection] = useState<any>('recitations');

  // Don't show navigation while loading user role
  if (loading) return null;

  // Only show for uploaders and admins
  if (role !== 'uploader' && role !== 'admin') return null;

  // Pages where navigation should be HIDDEN
  const hiddenPaths = [
    /^\/piece\/[^/]+$/, // Piece viewing page: /piece/:id
    /^\/piece\/[^/]+\/.*$/, // Any sub-routes of piece
    /^\/uploader$/, // Uploader dashboard (has its own nav)
    /^\/admin$/, // Admin dashboard (has its own nav)
    /^\/uploader\/piece\/.*$/, // Add/edit piece pages for uploader
    /^\/admin\/piece\/.*$/, // Add/edit piece pages for admin
    /^\/admin\/category\/.*$/, // Add/edit category pages
    /^\/quran(\/.*)?$/, // Any Quran related pages
  ];


  // Check if current path matches any hidden pattern
  const shouldHide = hiddenPaths.some(pattern => pattern.test(location.pathname));
  
  if (shouldHide) return null;

  // Render appropriate navigation based on role
  return (
    <>
      {/* Spacer div to push content up on mobile - prevents content from being hidden behind nav */}
      <div className="md:hidden h-24" aria-hidden="true" />
      
      {/* Render appropriate navigation based on role */}
      {role === 'uploader' && (
        <UploaderMobileBottomNav
          activeSection={uploaderSection}
          setActiveSection={setUploaderSection}
        />
      )}
      {role === 'admin' && (
        <AdminMobileBottomNav
          activeSection={adminSection}
          setActiveSection={setAdminSection}
        />
      )}
    </>
  );
};

