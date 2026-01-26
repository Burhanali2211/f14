import { lazy, Suspense, useState, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebar, type AdminActiveSection } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminPageSkeleton } from '@/components/admin/AdminLoadingSkeleton';
import { AdminMobileBottomNav, AdminMobileNavSheet } from '@/components/admin';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';

// Lazy load section components for better performance
const AdminRecitationsSection = lazy(() => 
  import('@/components/admin/sections/AdminRecitationsSection').then(m => ({ default: m.AdminRecitationsSection }))
);
const AdminCategoriesSection = lazy(() => 
  import('@/components/admin/sections/AdminCategoriesSection').then(m => ({ default: m.AdminCategoriesSection }))
);
const AdminImamsSection = lazy(() => 
  import('@/components/admin/sections/AdminImamsSection').then(m => ({ default: m.AdminImamsSection }))
);
const AdminArtistesSection = lazy(() => 
  import('@/components/admin/sections/AdminArtistesSection').then(m => ({ default: m.AdminArtistesSection }))
);
const AdminEventsSection = lazy(() => 
  import('@/components/admin/sections/AdminEventsSection').then(m => ({ default: m.AdminEventsSection }))
);
const AdminUsersSection = lazy(() => 
  import('@/components/admin/sections/AdminUsersSection').then(m => ({ default: m.AdminUsersSection }))
);
const AdminEarningsSection = lazy(() => 
  import('@/components/admin/sections/AdminEarningsSection').then(m => ({ default: m.AdminEarningsSection }))
);
const AdminUploaderTrackingSection = lazy(() => 
  import('@/components/admin/sections/AdminUploaderTrackingSection').then(m => ({ default: m.AdminUploaderTrackingSection }))
);
const AdminFiqhSection = lazy(() => 
  import('@/components/admin/sections/AdminFiqhSection').then(m => ({ default: m.AdminFiqhSection }))
);

// Section loading fallback
const SectionLoader = memo(() => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
));
SectionLoader.displayName = 'SectionLoader';

// Main admin content component
const AdminContent = memo(() => {
  const { loading, categories, pieces, imams, artistes, events, userProfiles, fetchData } = useAdmin();
  const [activeSection, setActiveSection] = useState<AdminActiveSection>('recitations');
  const [mobileNavSheetOpen, setMobileNavSheetOpen] = useState(false);

  if (loading) {
    return <AdminPageSkeleton />;
  }

  // Render section content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'recitations':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminRecitationsSection />
          </Suspense>
        );
      case 'categories':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminCategoriesSection />
          </Suspense>
        );
      case 'imams':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminImamsSection />
          </Suspense>
        );
      case 'artistes':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminArtistesSection />
          </Suspense>
        );
      case 'events':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminEventsSection />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminUsersSection />
          </Suspense>
        );
      case 'earnings':
        return (
          <Suspense fallback={<SectionLoader />}>
            <AdminEarningsSection />
          </Suspense>
        );
        case 'uploader-tracking':
          return (
            <Suspense fallback={<SectionLoader />}>
              <AdminUploaderTrackingSection />
            </Suspense>
          );
        case 'fiqh':
          return (
            <Suspense fallback={<SectionLoader />}>
              <AdminFiqhSection />
            </Suspense>
          );
        default:
          return null;

    }
  };

  // Calculate uploaders count from userProfiles
  const uploadersCount = userProfiles.filter(u => u.role === 'uploader').length;
  
  const counts = {
    pieces: pieces.length,
    categories: categories.length,
    imams: imams.length,
    artistes: artistes.length,
    events: events.length,
    users: userProfiles.length,
    uploaders: uploadersCount,
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          counts={counts}
        />
        <SidebarInset className="flex-1 pb-24 md:pb-0">
          <AdminHeader
            activeSection={activeSection}
            onRefresh={fetchData}
            loading={loading}
          />
          <main className="p-4 md:p-6 w-full max-w-full overflow-x-hidden overflow-y-auto">
            <div className="w-full max-w-full">
              {renderSectionContent()}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminMobileBottomNav
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Mobile Nav Sheet for all sections */}
      <AdminMobileNavSheet
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        counts={counts}
        isOpen={mobileNavSheetOpen}
        onClose={() => setMobileNavSheetOpen(false)}
      />
    </SidebarProvider>
  );
});
AdminContent.displayName = 'AdminContent';

// Main AdminPage component with provider
export default function AdminPage() {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
}
