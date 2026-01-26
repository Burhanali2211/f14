import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

export const AdminItemSkeleton = () => (
  <div className="flex items-center justify-between p-4 bg-card rounded-xl border">
    <div className="flex items-center gap-4 min-w-0 flex-1">
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    <div className="flex items-center gap-2 ml-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  </div>
);

export const AdminPageSkeleton = () => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <Sidebar className="border-r">
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-5 w-20 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <div className="space-y-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-6 space-y-2">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex-1">
        <header className="flex h-16 items-center gap-4 border-b px-6">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </header>
        <main className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
            <div className="grid gap-3">
              {[...Array(5)].map((_, i) => (
                <AdminItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  </SidebarProvider>
);

