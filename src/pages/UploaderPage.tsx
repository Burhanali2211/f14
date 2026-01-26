import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, Plus, FileText, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EarningsDashboard } from '@/components/EarningsDashboard';
import { syncEarningsWithPieceCountAsync, UploaderEarnings } from '@/lib/uploader-earnings';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { invalidateCache } from '@/lib/data-cache';
import type { Category, Piece, Imam } from '@/lib/supabase-types';

// Import refactored components
import {
  UploaderSidebar,
  UploaderHeader,
  UploaderMobileBottomNav,
  PieceCard,
  StatsPanel,
  FilterBar,
  BulkSelectionBar,
  RecentActivity,
  EmptyState,
  Pagination,
  UploaderPageSkeleton,
  DeleteConfirmDialog,
  KeyboardHelpDialog,
  ImageViewerDialog,
  type ActiveSection,
  type Activity,
  type DeletedPiece,
} from '@/components/uploader';

const ITEMS_PER_PAGE = 20;

export default function UploaderPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  
  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<UploaderEarnings | null>(null);
  
  // UI state
  const [activeSection, setActiveSection] = useState<ActiveSection>('recitations');
  const [showStats, setShowStats] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  
  // Filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'language'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  
  // Selection state
  const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Delete state
  const [deleteDialog, setDeleteDialog] = useState<Piece | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletedPieces, setDeletedPieces] = useState<DeletedPiece[]>([]);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Activity tracking
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data fetching
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = getCurrentUser();
      if (!user) {
        logger.error('Error getting user: No user found');
        toast({ title: 'Error', description: 'Failed to authenticate', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const [catRes, imamRes, pieceRes] = await Promise.all([
        safeQuery(async () => await supabase.from('categories').select('*').order('name')),
        safeQuery(async () => await supabase.from('imams').select('*').order('order_index, name')),
        safeQuery(async () => await supabase.from('pieces').select('*').eq('user_id', user.id).order('created_at', { ascending: false })),
      ]);

      if (catRes.error) logger.error('Error fetching categories:', catRes.error);
      if (catRes.data) setCategories(catRes.data as Category[]);

      if (imamRes.error) logger.error('Error fetching imams:', imamRes.error);
      if (imamRes.data) setImams(imamRes.data as Imam[]);

      if (pieceRes.error) {
        logger.error('Error fetching pieces:', pieceRes.error);
        toast({ title: 'Error', description: 'Failed to load recitations', variant: 'destructive' });
      } else if (pieceRes.data) {
        const piecesData = pieceRes.data as unknown as Piece[];
        setAllPieces(piecesData);
        
        const currentUser = getCurrentUser();
        if (currentUser) {
          const updatedEarnings = await syncEarningsWithPieceCountAsync(currentUser.id, piecesData.length);
            setEarnings(updatedEarnings);
          }
        }
    } catch (err) {
      logger.error('Unexpected error in fetchData:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && (role === 'uploader' || role === 'admin')) {
      fetchData();
    }
  }, [roleLoading, role, fetchData]);

  // Computed values
  const filteredPieces = useMemo(() => {
    let result = [...allPieces];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.text_content?.toLowerCase().includes(query) ||
        p.reciter?.toLowerCase().includes(query)
      );
    }
    
    if (filterCategory !== 'all') {
      result = result.filter(p => p.category_id === filterCategory);
    }
    
    if (filterLanguage !== 'all') {
      result = result.filter(p => p.language === filterLanguage);
    }
    
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      
      if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortBy === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sortBy === 'language') {
        aVal = a.language.toLowerCase();
        bVal = b.language.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
    
    return result;
  }, [allPieces, searchQuery, filterCategory, filterLanguage, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredPieces.length / ITEMS_PER_PAGE);
  
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPieces.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPieces, currentPage]);

  const statistics = useMemo(() => {
    const stats = {
      total: allPieces.length,
      withImages: allPieces.filter(p => {
        if (!p.image_url) return false;
        if (Array.isArray(p.image_url)) return p.image_url.length > 0;
        return !!p.image_url;
      }).length,
      withVideos: allPieces.filter(p => p.video_url).length,
      byCategory: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
    };
    
    allPieces.forEach(piece => {
      const cat = categories.find(c => c.id === piece.category_id);
      if (cat) {
        stats.byCategory[cat.name] = (stats.byCategory[cat.name] || 0) + 1;
      }
      stats.byLanguage[piece.language] = (stats.byLanguage[piece.language] || 0) + 1;
    });
    
    return stats;
  }, [allPieces, categories]);

  // Handlers
  const handleExport = useCallback((format: 'csv' | 'json') => {
    if (filteredPieces.length === 0) return;
    
    if (format === 'json') {
      const data = JSON.stringify(filteredPieces, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recitations-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['ID', 'Title', 'Category', 'Language', 'Reciter', 'Created At'];
      const rows = filteredPieces.map(p => {
        const cat = categories.find(c => c.id === p.category_id);
        return [p.id, p.title, cat?.name || '', p.language, p.reciter || '', p.created_at];
      });
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recitations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    toast({ title: 'Success', description: `Exported ${filteredPieces.length} recitations as ${format.toUpperCase()}` });
  }, [filteredPieces, categories]);

  const togglePieceSelection = useCallback((pieceId: string) => {
    setSelectedPieces(prev => {
      const next = new Set(prev);
      if (next.has(pieceId)) {
        next.delete(pieceId);
      } else {
        next.add(pieceId);
      }
      return next;
    });
  }, []);

  const handleUndoDelete = useCallback(async (piece: Piece) => {
    try {
      // Convert piece to database format (image_url should be string, not array)
      const pieceData = {
        ...piece,
        image_url: Array.isArray(piece.image_url) ? piece.image_url[0] || null : piece.image_url,
      };
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('pieces').insert([pieceData])
      );
      
      if (error) {
        logger.error('Error restoring piece:', error);
        toast({ title: 'Error', description: 'Failed to restore recitation', variant: 'destructive' });
      } else {
        setAllPieces(prev => [piece, ...prev]);
        setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        toast({ title: 'Success', description: 'Recitation restored' });
      }
    } catch (err) {
      logger.error('Unexpected error restoring piece:', err);
      toast({ title: 'Error', description: 'Failed to restore recitation', variant: 'destructive' });
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedPieces.size === 0) return;

    setBulkDeleting(true);
    const pieceIds = Array.from(selectedPieces);
    let successCount = 0;
    let failCount = 0;

    try {
      const piecesToDelete = allPieces.filter(p => pieceIds.includes(p.id));
      piecesToDelete.forEach(piece => {
        setDeletedPieces(prev => [{ piece, deletedAt: Date.now() }, ...prev].slice(0, 10));
        const newActivity: Activity = {
          id: `delete-${piece.id}-${Date.now()}`,
          type: 'delete',
          pieceId: piece.id,
          pieceTitle: piece.title,
          timestamp: Date.now(),
        };
        setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));
      });

      for (const pieceId of pieceIds) {
        try {
          const { error } = await authenticatedQuery(async () =>
            await supabase.from('pieces').delete().eq('id', pieceId)
          );

          if (error) {
            logger.error(`Error deleting piece ${pieceId}:`, error);
            failCount++;
            setDeletedPieces(prev => prev.filter(d => d.piece.id !== pieceId));
          } else {
            successCount++;
          }
        } catch (err) {
          logger.error(`Unexpected error deleting piece ${pieceId}:`, err);
          failCount++;
          setDeletedPieces(prev => prev.filter(d => d.piece.id !== pieceId));
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `${successCount} recitation(s) deleted successfully${failCount > 0 ? `. ${failCount} failed.` : ''}`,
        });
        setAllPieces(prev => prev.filter(p => !pieceIds.includes(p.id)));
        setSelectedPieces(new Set());
        setSelectMode(false);
        if (paginatedPieces.length <= pieceIds.length && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        invalidateCache('index');
        invalidateCache('pieces*');
        const user = getCurrentUser();
        if (user) {
          invalidateCache(`uploader:data:userId=${user.id}*`);
        }
      } else {
        toast({ title: 'Error', description: 'Failed to delete recitations', variant: 'destructive' });
      }
    } catch (err) {
      logger.error('Unexpected error in bulk delete:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedPieces, allPieces, paginatedPieces.length, currentPage]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return;

    const piece = deleteDialog;
    setDeleting(piece.id);

    const deletedPiece: DeletedPiece = { piece, deletedAt: Date.now() };
    setDeletedPieces(prev => [deletedPiece, ...prev].slice(0, 10));

    const newActivity: Activity = {
      id: `delete-${piece.id}-${Date.now()}`,
      type: 'delete',
      pieceId: piece.id,
      pieceTitle: piece.title,
      timestamp: Date.now(),
    };
    setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));

    try {
      const { error } = await authenticatedQuery(async () =>
        await supabase.from('pieces').delete().eq('id', piece.id)
      );

      if (error) {
        logger.error('Error deleting piece:', error);
        setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        setRecentActivity(prev => prev.filter(a => a.pieceId !== piece.id || a.type !== 'delete'));
        toast({ title: 'Error', description: error.message || 'Failed to delete recitation', variant: 'destructive' });
      } else {
        setAllPieces(prev => prev.filter(p => p.id !== piece.id));
        if (paginatedPieces.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        invalidateCache('index');
        invalidateCache('pieces*');
        const user = getCurrentUser();
        if (user) {
          invalidateCache(`uploader:data:userId=${user.id}*`);
        }
        
        toast({
          title: 'Recitation deleted',
          description: 'You can undo this action within 10 seconds',
          action: (
            <Button variant="outline" size="sm" onClick={() => handleUndoDelete(piece)}>
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
          ),
        });

        if (undoTimeout) clearTimeout(undoTimeout);
        const timeout = setTimeout(() => {
          setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        }, 10000);
        setUndoTimeout(timeout);
      }
    } catch (err) {
      logger.error('Unexpected error deleting piece:', err);
      setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setDeleting(null);
      setDeleteDialog(null);
    }
  }, [deleteDialog, paginatedPieces.length, currentPage, undoTimeout, handleUndoDelete]);

  const handleCopyUrl = useCallback(async (piece: Piece) => {
    const url = `${window.location.origin}/piece/${piece.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Success', description: 'URL copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy URL', variant: 'destructive' });
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterLanguage('all');
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectedPieces(new Set());
    setSelectMode(false);
  }, []);

  // Loading state
  if (roleLoading || loading) {
    return <UploaderPageSkeleton />;
  }

  // Authorization check
  if (role !== 'uploader' && role !== 'admin') {
    return null;
  }

  const hasFilters = filterCategory !== 'all' || filterLanguage !== 'all' || searchQuery.length > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <UploaderSidebar 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          recitationCount={filteredPieces.length}
          earnings={earnings}
        />
        
        <SidebarInset className="flex-1 flex flex-col pb-24 md:pb-0">
          <UploaderHeader
            activeSection={activeSection}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showStats={showStats}
            setShowStats={setShowStats}
            onExport={handleExport}
            onRefresh={fetchData}
            onShowHelp={() => setShowKeyboardHelp(true)}
            loading={loading}
            filteredCount={filteredPieces.length}
            searchInputRef={searchInputRef}
          />
          
          <main className="flex-1 p-4 md:p-6 overflow-auto w-full max-w-full">
            <div className="w-full max-w-full">
              {/* Earnings Section */}
              {activeSection === 'earnings' && (
                <div className="max-w-5xl mx-auto w-full">
                  <EarningsDashboard earnings={earnings} onRefresh={fetchData} />
                </div>
              )}

              {/* Recitations Section */}
              {activeSection === 'recitations' && (
                <div className="space-y-6 w-full max-w-full">
                {/* Mobile Search */}
                <div className="md:hidden relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search recitations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-xl text-base"
                    aria-label="Search recitations"
                  />
                </div>
                
                {/* Error State */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Error loading data</p>
                      <p className="text-xs text-destructive/80 mt-1">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setError(null); fetchData(); }} className="rounded-lg">
                      Retry
                  </Button>
                </div>
                )}
                
                {/* Stats Panel */}
                {showStats && (
                  <StatsPanel 
                    statistics={statistics} 
                    filteredCount={filteredPieces.length} 
                    onClose={() => setShowStats(false)} 
                  />
                )}
                
                {/* Filter Bar */}
                <FilterBar
                  categories={categories}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  filterLanguage={filterLanguage}
                  setFilterLanguage={setFilterLanguage}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onAddRecitation={() => navigate('/uploader/piece/new')}
                />

                {/* Content */}
            {paginatedPieces.length === 0 ? (
                  <EmptyState
                    hasFilters={hasFilters}
                    onClearFilters={handleClearFilters}
                    onAddRecitation={() => navigate('/uploader/piece/new')}
                  />
                ) : (
                  <>
                    {/* Bulk Selection Bar */}
                    {selectMode && (
                      <BulkSelectionBar
                        selectedCount={selectedPieces.size}
                        onCancel={handleCancelSelection}
                        onDelete={handleBulkDelete}
                        isDeleting={bulkDeleting}
                      />
                    )}

                    {/* Select Multiple Button */}
                {!selectMode && paginatedPieces.length > 0 && (
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {filteredPieces.length} recitation{filteredPieces.length !== 1 ? 's' : ''} total
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectMode(true)} 
                          aria-label="Enable select mode"
                          className="rounded-lg gap-2"
                        >
                          <CheckSquare className="w-4 h-4" />
                            Select Multiple
                          </Button>
                        </div>
                )}

                    {/* Recitations List */}
                <div className="grid gap-3 w-full max-w-full overflow-hidden">
                  {paginatedPieces.map((piece) => {
                    const category = categories.find(c => c.id === piece.category_id);
                    const imam = imams.find(f => f.id === piece.imam_id);
                    
                    return (
                      <PieceCard
                        key={piece.id}
                        piece={piece}
                        category={category}
                        imam={imam}
                            isDeleting={deleting === piece.id}
                            isSelected={selectedPieces.has(piece.id)}
                        selectMode={selectMode}
                        onEdit={(p) => navigate(`/uploader/piece/${p.id}/edit`)}
                        onDelete={(p) => setDeleteDialog(p)}
                        onImageClick={(url) => { setImageViewerUrl(url); setImageViewerOpen(true); }}
                        onToggleSelect={togglePieceSelection}
                            onCopyUrl={handleCopyUrl}
                        onView={(p) => navigate(`/piece/${p.id}`)}
                      />
                    );
                  })}
                </div>

                    {/* Pagination */}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredPieces.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setCurrentPage}
                    />
              </>
            )}
                
                {/* Recent Activity */}
                <RecentActivity 
                  activities={recentActivity} 
                  onClear={() => setRecentActivity([])} 
                />
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Dialogs */}
      <DeleteConfirmDialog
        piece={deleteDialog}
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleDelete}
        isDeleting={!!deleting}
      />

      <KeyboardHelpDialog
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      <ImageViewerDialog
        imageUrl={imageViewerUrl}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      <UploaderMobileBottomNav
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        earnings={earnings}
      />
    </SidebarProvider>
  );
}
