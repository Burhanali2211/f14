import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, Loader2, ChevronLeft, X as XIcon, Search, ChevronRight, CheckSquare, Square, Download, BarChart3, Info, Copy, MoreVertical, Undo2, Clock, Eye, HelpCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { getKarbalaPlaceholder } from '@/lib/utils';
import type { Category, Piece, Imam } from '@/lib/supabase-types';

const ITEMS_PER_PAGE = 20;

// Memoized Piece Card Component for performance
interface PieceCardProps {
  piece: Piece;
  category: Category | undefined;
  imam: Imam | undefined;
  isDeleting: boolean;
  isSelected: boolean;
  selectMode: boolean;
  onEdit: (piece: Piece) => void;
  onDelete: (piece: Piece) => void;
  onImageClick: (url: string) => void;
  onToggleSelect: (pieceId: string) => void;
  onCopyUrl: (piece: Piece) => void;
  onView: (piece: Piece) => void;
}

const PieceCard = memo(({ piece, category, imam, isDeleting, isSelected, selectMode, onEdit, onDelete, onImageClick, onToggleSelect, onCopyUrl, onView }: PieceCardProps) => {
  return (
    <div className={`flex items-center justify-between p-4 bg-card rounded-lg shadow-soft hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {selectMode && (
        <button
          onClick={() => onToggleSelect(piece.id)}
          className="mr-2 p-2 hover:bg-secondary rounded transition-colors min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
          aria-label={isSelected ? `Deselect ${piece.title}` : `Select ${piece.title}`}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      )}
      <div 
        className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
        onClick={() => {
          if (!selectMode) {
            onImageClick(piece.image_url || getKarbalaPlaceholder(piece.id));
          }
        }}
      >
        <img 
          src={piece.image_url || getKarbalaPlaceholder(piece.id)} 
          alt={piece.title}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getKarbalaPlaceholder(piece.id);
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-foreground truncate">{piece.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {category?.name} {imam && `• ${imam.name}`} • {piece.language} {piece.reciter && `• ${piece.reciter}`}
            </p>
            {piece.view_count > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {piece.view_count}
              </span>
            )}
            {piece.updated_at && piece.updated_at !== piece.created_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1" title={`Last edited: ${new Date(piece.updated_at).toLocaleDateString()}`}>
                <Clock className="w-3 h-3" />
                Edited
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {!selectMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label="More options"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(piece)}>
                <Eye className="w-4 h-4 mr-2" />
                View Recitation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(piece)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyUrl(piece)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(piece)}
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {selectMode && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(piece);
                    }}
                    aria-label={`Edit ${piece.title}`}
                    className="h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit recitation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(piece);
                    }}
                    disabled={isDeleting}
                    aria-label={`Delete ${piece.title}`}
                    className="h-10 w-10 min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete recitation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.piece.id === nextProps.piece.id &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectMode === nextProps.selectMode &&
    prevProps.category?.id === nextProps.category?.id &&
    prevProps.imam?.id === nextProps.imam?.id
  );
});

PieceCard.displayName = 'PieceCard';

export default function UploaderPage() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [imams, setImams] = useState<Imam[]>([]);
  const [permissions, setPermissions] = useState<{ categoryIds: string[]; imamIds: string[] }>({ categoryIds: [], imamIds: [] });
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const [deleting, setDeleting] = useState<string | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  
  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<Piece | null>(null);
  
  // Sort and filter
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'language'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  
  // Error and retry
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Bulk operations
  const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  
  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Statistics and export
  const [showStats, setShowStats] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Undo/Redo functionality
  interface DeletedPiece {
    piece: Piece;
    deletedAt: number;
  }
  const [deletedPieces, setDeletedPieces] = useState<DeletedPiece[]>([]);
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Recent activity
  type ActivityType = 'delete' | 'create' | 'update';
  interface Activity {
    id: string;
    type: ActivityType;
    pieceId: string;
    pieceTitle: string;
    timestamp: number;
  }
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  
  // Undo delete (defined early for use in callbacks)
  const handleUndoDelete = useCallback(async (piece: Piece) => {
    try {
      // Restore piece
      const { error } = await authenticatedQuery(async () =>
        await supabase
          .from('pieces')
          .insert([piece])
      );

      if (error) {
        logger.error('Error undoing delete:', error);
        toast({
          title: 'Error',
          description: 'Failed to restore recitation. It may have been permanently deleted.',
          variant: 'destructive',
        });
      } else {
        // Add back to local state
        setAllPieces(prev => [piece, ...prev]);
        // Remove from deleted list
        setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        // Update activity
        const newActivity: Activity = {
          id: `undo-${piece.id}-${Date.now()}`,
          type: 'create',
          pieceId: piece.id,
          pieceTitle: piece.title,
          timestamp: Date.now(),
        };
        setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));
        
        toast({
          title: 'Success',
          description: 'Recitation restored successfully',
        });
        // Invalidate cache
        setLastFetchTime(0);
      }
    } catch (error: any) {
      logger.error('Unexpected error undoing delete:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore recitation.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [role, roleLoading]);

  useEffect(() => {
    if (role === 'uploader' || role === 'admin') {
      fetchData();
    }
  }, [role]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedPieces(new Set());
    setSelectMode(false);
  }, [filterCategory, filterLanguage, debouncedSearch, sortBy, sortOrder]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || 
          (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + N: New piece
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (categories.length > 0 || role === 'admin') {
          navigate('/uploader/piece/new');
        }
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl/Cmd + K: Toggle select mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSelectMode(prev => !prev);
      }

      // Escape: Clear select mode or close dialogs
      if (e.key === 'Escape') {
        if (selectMode) {
          setSelectMode(false);
          setSelectedPieces(new Set());
        }
        if (showStats) setShowStats(false);
        if (showKeyboardHelp) setShowKeyboardHelp(false);
        if (imageViewerOpen) setImageViewerOpen(false);
      }

      // Delete: Delete selected pieces
      if (e.key === 'Delete' && selectedPieces.size > 0 && selectMode) {
        e.preventDefault();
        const piecesToDelete = allPieces.filter(p => selectedPieces.has(p.id));
        if (piecesToDelete.length > 0) {
          // Use first piece to show dialog, but will delete all selected
          setDeleteDialog(piecesToDelete[0]);
        }
      }

      // Ctrl/Cmd + ?: Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }

      // Ctrl/Cmd + U: Undo last delete
      if ((e.ctrlKey || e.metaKey) && e.key === 'u' && deletedPieces.length > 0) {
        e.preventDefault();
        const lastDeleted = deletedPieces[0];
        if (Date.now() - lastDeleted.deletedAt < 10000) {
          handleUndoDelete(lastDeleted.piece);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories.length, role, navigate, selectMode, selectedPieces, allPieces, showStats, showKeyboardHelp, imageViewerOpen, deletedPieces, handleUndoDelete]);


  // Export functionality (defined early but uses filteredPieces later)
  const handleExport = useCallback((format: 'csv' | 'json', piecesToExport: Piece[]) => {
    const dataToExport = piecesToExport.map(piece => {
      const category = categories.find(c => c.id === piece.category_id);
      const imam = imams.find(f => f.id === piece.imam_id);
      return {
        title: piece.title,
        category: category?.name || '',
        imam: imam?.name || '',
        language: piece.language,
        reciter: piece.reciter || '',
        created_at: piece.created_at,
        has_image: !!piece.image_url,
        has_video: !!piece.video_url,
      };
    });

    if (format === 'csv') {
      const headers = Object.keys(dataToExport[0] || {});
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `recitations-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `recitations-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }

    toast({
      title: 'Success',
      description: `Exported ${dataToExport.length} recitation(s) as ${format.toUpperCase()}`,
    });
  }, [categories, imams]);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const checkAuth = async () => {
    if (roleLoading) {
      return;
    }
    
    if (role !== 'uploader' && role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You need uploader permissions to access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
  };

  const fetchData = async (isRetry = false, forceRefresh = false) => {
    // Check cache if not forcing refresh
    const now = Date.now();
    if (!forceRefresh && !isRetry && now - lastFetchTime < CACHE_DURATION && allPieces.length > 0) {
      return;
    }

    if (!isRetry) {
      setLoading(true);
      setError(null);
    }
    
    try {
      // Fetch user permissions - use custom auth system
      const user = getCurrentUser();
      if (!user) {
        logger.error('Error getting user: No user found');
        toast({ title: 'Error', description: 'Failed to authenticate', variant: 'destructive' });
        setLoading(false);
        return;
      }

      let categoryIds: string[] = [];
      let imamIds: string[] = [];

      // Only fetch permissions for uploaders (admins have access to everything)
      if (role === 'uploader') {
        const { data: perms, error: permsError } = await safeQuery(async () =>
          await (supabase as any)
            .from('uploader_permissions')
            .select('category_id, imam_id')
            .eq('user_id', user.id)
        );

        if (permsError) {
          logger.error('Error fetching permissions:', permsError);
        } else {
          const permsArray = (perms || []) as Array<{ category_id?: string | null; imam_id?: string | null }>;
          categoryIds = permsArray.filter(p => p.category_id).map(p => p.category_id!) || [];
          imamIds = permsArray.filter(p => p.imam_id).map(p => p.imam_id!) || [];
        }
      }

      setPermissions({ categoryIds, imamIds });

      // Fetch categories and figures user has permission for
      const [catRes, figureRes, pieceRes] = await Promise.all([
        safeQuery(async () =>
          await (role === 'admin' 
            ? supabase.from('categories').select('*').order('name')
            : supabase.from('categories').select('*').in('id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000']).order('name'))
        ),
        safeQuery(async () =>
          await (role === 'admin'
            ? (supabase as any).from('imams').select('*').order('order_index, name')
            : (supabase as any).from('imams').select('*').in('id', imamIds.length > 0 ? imamIds : ['00000000-0000-0000-0000-000000000000']).order('order_index, name'))
        ),
        safeQuery(async () => await supabase.from('pieces').select('*').order('created_at', { ascending: false })),
      ]);

      if (catRes.error) {
        logger.error('Error fetching categories:', catRes.error);
        toast({ title: 'Error', description: 'Failed to load categories', variant: 'destructive' });
      } else if (catRes.data) {
        setCategories(catRes.data as Category[]);
      }

      if (figureRes.error) {
        logger.error('Error fetching imams:', figureRes.error);
        toast({ title: 'Error', description: 'Failed to load Ahlulbayt', variant: 'destructive' });
      } else if (figureRes.data) {
        setImams(figureRes.data as Imam[]);
      }

      if (pieceRes.error) {
        logger.error('Error fetching pieces:', pieceRes.error);
        toast({ title: 'Error', description: 'Failed to load recitations', variant: 'destructive' });
      } else if (pieceRes.data) {
        // Map database results to Piece type (handle figure_id -> imam_id)
        const rawPieces = pieceRes.data as unknown as Array<any>;
        const mappedPieces = rawPieces.map(p => ({
          ...p,
          imam_id: p.imam_id || p.figure_id || null,
        })) as Piece[];
        
        // Filter pieces to only show those user can access
        const accessiblePieces = mappedPieces.filter(piece => {
          if (role === 'admin') return true;
          return categoryIds.includes(piece.category_id) && 
                 (piece.imam_id === null || imamIds.includes(piece.imam_id));
        });
        
        setAllPieces(accessiblePieces);
        setLastFetchTime(now);
      }
    } catch (error) {
      logger.error('Unexpected error in fetchData:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      if (!isRetry && retryCount < 2) {
        // Auto-retry up to 2 times
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchData(true);
        }, 1000 * retryCount); // Exponential backoff
      } else {
        toast({ 
          title: 'Error', 
          description: errorMessage,
          variant: 'destructive',
        });
        setLoading(false);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  // Filter, sort and paginate pieces
  const filteredPieces = useMemo(() => {
    let filtered = allPieces;
    
    // Apply search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(piece => {
        const category = categories.find(c => c.id === piece.category_id);
        const imam = imams.find(f => f.id === piece.imam_id);
        
        return (
          piece.title.toLowerCase().includes(query) ||
          piece.reciter?.toLowerCase().includes(query) ||
          piece.language.toLowerCase().includes(query) ||
          category?.name.toLowerCase().includes(query) ||
          imam?.name.toLowerCase().includes(query)
        );
      });
    }
    
    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(piece => piece.category_id === filterCategory);
    }
    
    // Apply language filter
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(piece => piece.language === filterLanguage);
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'language':
          comparison = a.language.localeCompare(b.language);
          break;
        case 'created_at':
        default:
          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          comparison = aDate - bDate;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [allPieces, debouncedSearch, categories, imams, filterCategory, filterLanguage, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredPieces.length / ITEMS_PER_PAGE);
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredPieces.slice(start, end);
  }, [filteredPieces, currentPage]);

  // Calculate statistics (must be after filteredPieces)
  const statistics = useMemo(() => {
    const total = allPieces.length;
    const byCategory = categories.reduce((acc, cat) => {
      acc[cat.name] = allPieces.filter(p => p.category_id === cat.id).length;
      return acc;
    }, {} as Record<string, number>);
    const byLanguage = allPieces.reduce((acc, piece) => {
      acc[piece.language] = (acc[piece.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const withImages = allPieces.filter(p => p.image_url).length;
    const withVideos = allPieces.filter(p => p.video_url).length;
    
    return {
      total,
      byCategory,
      byLanguage,
      withImages,
      withVideos,
      withoutMedia: total - withImages - withVideos,
    };
  }, [allPieces, categories]);

  // Toggle piece selection
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

  // Select all visible pieces
  const selectAll = useCallback(() => {
    if (selectedPieces.size === paginatedPieces.length) {
      setSelectedPieces(new Set());
    } else {
      setSelectedPieces(new Set(paginatedPieces.map(p => p.id)));
    }
  }, [paginatedPieces, selectedPieces.size]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedPieces.size === 0) return;

    setBulkDeleting(true);
    const pieceIds = Array.from(selectedPieces);
    let successCount = 0;
    let failCount = 0;

    try {
      // Check permissions for all pieces
      if (role !== 'admin') {
        const piecesToDelete = allPieces.filter(p => pieceIds.includes(p.id));
        const unauthorized = piecesToDelete.filter(piece => {
          const hasCategoryPerm = permissions.categoryIds.includes(piece.category_id);
          const hasImamPerm = !piece.imam_id || permissions.imamIds.includes(piece.imam_id);
          return !hasCategoryPerm || !hasImamPerm;
        });

        if (unauthorized.length > 0) {
          toast({
            title: 'Permission Denied',
            description: `You don't have permission to delete ${unauthorized.length} recitation(s).`,
            variant: 'destructive',
          });
          setBulkDeleting(false);
          return;
        }
      }

      // Save pieces for undo
      const piecesToDelete = allPieces.filter(p => pieceIds.includes(p.id));
      piecesToDelete.forEach(piece => {
        setDeletedPieces(prev => [{
          piece,
          deletedAt: Date.now(),
        }, ...prev].slice(0, 10));
        const newActivity: Activity = {
          id: `delete-${piece.id}-${Date.now()}`,
          type: 'delete',
          pieceId: piece.id,
          pieceTitle: piece.title,
          timestamp: Date.now(),
        };
        setRecentActivity(prev => [newActivity, ...prev].slice(0, 20));
      });

      // Delete pieces one by one (Supabase doesn't support bulk delete easily)
      for (const pieceId of pieceIds) {
        try {
          const { error } = await authenticatedQuery(async () =>
            await supabase
              .from('pieces')
              .delete()
              .eq('id', pieceId)
          );

          if (error) {
            logger.error(`Error deleting piece ${pieceId}:`, error);
            failCount++;
            // Remove from undo list if delete failed
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
          description: `${successCount} recitation(s) deleted successfully${failCount > 0 ? `. ${failCount} failed.` : ''}. You can undo within 10 seconds.`,
          action: successCount === 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const piece = piecesToDelete[0];
                if (piece) await handleUndoDelete(piece);
              }}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
          ) : undefined,
        });
        // Remove from local state
        setAllPieces(prev => prev.filter(p => !pieceIds.includes(p.id)));
        setSelectedPieces(new Set());
        setSelectMode(false);
        // Reset to first page if current page is empty
        if (paginatedPieces.length <= pieceIds.length && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        // Invalidate cache
        setLastFetchTime(0);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete recitations. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      logger.error('Unexpected error in bulk delete:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedPieces, allPieces, role, permissions, paginatedPieces.length, currentPage]);

  // Delete piece with undo support
  const handleDelete = useCallback(async () => {
    if (!deleteDialog) return;

    const piece = deleteDialog;
    setDeleting(piece.id);

    // Check permissions
    if (role !== 'admin') {
      const hasCategoryPerm = permissions.categoryIds.includes(piece.category_id);
      const hasImamPerm = !piece.imam_id || permissions.imamIds.includes(piece.imam_id);
      
      if (!hasCategoryPerm || !hasImamPerm) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to delete this recitation.',
          variant: 'destructive',
        });
        setDeleting(null);
        setDeleteDialog(null);
        return;
      }
    }

    // Save piece for undo
    const deletedPiece: DeletedPiece = {
      piece,
      deletedAt: Date.now(),
    };
    setDeletedPieces(prev => [deletedPiece, ...prev].slice(0, 10)); // Keep last 10

    // Add to activity
        const newActivity: Activity = {
          id: `delete-${piece.id}-${Date.now()}`,
          type: 'delete',
          pieceId: piece.id,
          pieceTitle: piece.title,
          timestamp: Date.now(),
        };
        setRecentActivity(prev => [newActivity, ...prev].slice(0, 20)); // Keep last 20 activities

    try {
      const { error } = await authenticatedQuery(async () =>
        await supabase
          .from('pieces')
          .delete()
          .eq('id', piece.id)
      );

      if (error) {
        logger.error('Error deleting piece:', error);
        // Remove from undo list if delete failed
        setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        setRecentActivity(prev => prev.filter(a => a.pieceId !== piece.id || a.type !== 'delete'));
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete recitation. Please try again.',
          variant: 'destructive',
        });
      } else {
        // Remove from local state
        setAllPieces(prev => prev.filter(p => p.id !== piece.id));
        // Reset to first page if current page is empty
        if (paginatedPieces.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        // Invalidate cache
        setLastFetchTime(0);
        
        // Show undo toast
        toast({
          title: 'Recitation deleted',
          description: 'You can undo this action within 10 seconds (Ctrl+U)',
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await handleUndoDelete(piece);
              }}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Undo
            </Button>
          ),
        });

        // Auto-remove undo option after 10 seconds
        if (undoTimeout) {
          clearTimeout(undoTimeout);
        }
        const timeout = setTimeout(() => {
          setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
        }, 10000);
        setUndoTimeout(timeout);
      }
    } catch (error: any) {
      logger.error('Unexpected error deleting piece:', error);
      setDeletedPieces(prev => prev.filter(d => d.piece.id !== piece.id));
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
      setDeleteDialog(null);
    }
  }, [deleteDialog, role, permissions, paginatedPieces.length, currentPage, undoTimeout]);


  // Skeleton loader component
  const PieceCardSkeleton = () => (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow-soft">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <Skeleton className="h-10 w-full sm:w-[300px]" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
          <div className="grid gap-3">
            {[...Array(5)].map((_, i) => (
              <PieceCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (role !== 'uploader' && role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Uploader Dashboard</h1>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeyboardHelp(true)}
                    aria-label="Show keyboard shortcuts"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Shortcuts
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keyboard shortcuts (Ctrl+/)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStats(!showStats)}
                    aria-label="Toggle statistics"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Stats
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View statistics</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv', filteredPieces)}
                    disabled={filteredPieces.length === 0}
                    aria-label="Export as CSV"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export filtered results as CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json', filteredPieces)}
                    disabled={filteredPieces.length === 0}
                    aria-label="Export as JSON"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export filtered results as JSON</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="bg-card border rounded-lg p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Statistics
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStats(false)}
                aria-label="Close statistics"
                className="min-h-[44px] min-w-[44px] touch-manipulation"
              >
                <XIcon className="w-5 h-5 stroke-[2.5]" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Recitations</p>
                <p className="text-2xl font-bold">{statistics.total}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">With Images</p>
                <p className="text-2xl font-bold">{statistics.withImages}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">With Videos</p>
                <p className="text-2xl font-bold">{statistics.withVideos}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Filtered Results</p>
                <p className="text-2xl font-bold">{filteredPieces.length}</p>
              </div>
            </div>
            {Object.keys(statistics.byCategory).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">By Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(statistics.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{cat}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(statistics.byLanguage).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">By Language</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(statistics.byLanguage).map(([lang, count]) => (
                    <div key={lang} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{lang}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {categories.length === 0 && role !== 'admin' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              You don't have permission to upload to any categories yet. Please contact an admin to grant you permissions.
            </p>
          </div>
        )}

        <Tabs defaultValue="pieces" className="space-y-6">
          <TabsList className="bg-card">
            <TabsTrigger value="pieces" className="gap-2">
              <FileText className="w-4 h-4" />
              Recitations ({filteredPieces.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pieces" className="space-y-4">
            {/* Error Banner */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Error loading data</p>
                  <p className="text-xs text-destructive/80 mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRetryCount(0);
                    setError(null);
                    fetchData();
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search Input */}
                <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search recitations... (Ctrl+F)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Search recitations"
                  />
                </div>
                
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => navigate('/uploader/piece/new')} 
                          disabled={categories.length === 0 && role !== 'admin'}
                          className="w-full sm:w-auto"
                          aria-label="Add new recitation"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Recitation
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Create new recitation (Ctrl+N)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(false, true)}
                    disabled={loading}
                    aria-label="Refresh data"
                    className="w-full sm:w-auto"
                  >
                    <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Category Filter */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Language Filter */}
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by language">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="Kashmiri">Kashmiri</SelectItem>
                    <SelectItem value="Urdu">Urdu</SelectItem>
                    <SelectItem value="Arabic">Arabic</SelectItem>
                    <SelectItem value="Persian">Persian</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'created_at' | 'title' | 'language')}>
                  <SelectTrigger className="w-full sm:w-[150px]" aria-label="Sort by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="language">Language</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Order */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  className="w-full sm:w-auto"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </Button>

                {/* Clear Filters */}
                {(filterCategory !== 'all' || filterLanguage !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterCategory('all');
                      setFilterLanguage('all');
                      setSearchQuery('');
                    }}
                    className="w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Pieces List */}
            {paginatedPieces.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" role="status" aria-live="polite">
                {searchQuery || filterCategory !== 'all' || filterLanguage !== 'all' ? (
                  <>
                    <p className="text-lg font-medium mb-2">No recitations found</p>
                    <p className="text-sm mb-4">Try adjusting your search or filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCategory('all');
                        setFilterLanguage('all');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">No recitations yet</p>
                    <p className="text-sm">Add your first recitation to get started!</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {selectMode && selectedPieces.size > 0 && (
                  <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {selectedPieces.size} recitation{selectedPieces.size !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPieces(new Set());
                          setSelectMode(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                      >
                        {bulkDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Select Mode Toggle */}
                {!selectMode && paginatedPieces.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectMode(true)}
                            aria-label="Enable select mode"
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Select Multiple
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select multiple items (Ctrl+K)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <div className="grid gap-3">
                  {paginatedPieces.map((piece) => {
                    const category = categories.find(c => c.id === piece.category_id);
                    const imam = imams.find(f => f.id === piece.imam_id);
                    const isDeleting = deleting === piece.id;
                    const isSelected = selectedPieces.has(piece.id);
                    
                    return (
                      <PieceCard
                        key={piece.id}
                        piece={piece}
                        category={category}
                        imam={imam}
                        isDeleting={isDeleting}
                        isSelected={isSelected}
                        selectMode={selectMode}
                        onEdit={(p) => navigate(`/uploader/piece/${p.id}/edit`)}
                        onDelete={(p) => setDeleteDialog(p)}
                        onImageClick={(url) => {
                          setImageViewerUrl(url);
                          setImageViewerOpen(true);
                        }}
                        onToggleSelect={togglePieceSelection}
                        onCopyUrl={async (p) => {
                          const url = `${window.location.origin}/piece/${p.id}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            toast({
                              title: 'Success',
                              description: 'URL copied to clipboard',
                            });
                          } catch (err) {
                            toast({
                              title: 'Error',
                              description: 'Failed to copy URL',
                              variant: 'destructive',
                            });
                          }
                        }}
                        onView={(p) => navigate(`/piece/${p.id}`)}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="flex items-center justify-between pt-4 border-t" aria-label="Pagination">
                    <div className="text-sm text-muted-foreground" aria-live="polite">
                      Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPieces.length)}</span> of{' '}
                      <span className="font-medium">{filteredPieces.length}</span> recitations
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        aria-label="Go to previous page"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <div className="text-sm text-muted-foreground px-2" aria-current="page">
                        Page {currentPage} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Go to next page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDialog?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Keyboard Shortcuts
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKeyboardHelp(false)}
              aria-label="Close keyboard shortcuts"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <XIcon className="w-5 h-5 stroke-[2.5]" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-sm mb-2">Navigation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Recitation</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Focus Search</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+F</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toggle Select Mode</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+/</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-sm mb-2">Actions</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Undo Delete</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+U</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delete Selected</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Delete</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Close/Cancel</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Note: On Mac, use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Cmd</kbd> instead of <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Activity Panel */}
      {recentActivity.length > 0 && (
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Activity
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRecentActivity([])}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {activity.type === 'delete' && <Trash2 className="w-3 h-3 text-destructive" />}
                  {activity.type === 'create' && <Plus className="w-3 h-3 text-green-600" />}
                  {activity.type === 'update' && <Edit2 className="w-3 h-3 text-blue-600" />}
                  <span className="text-muted-foreground truncate">{activity.pieceTitle}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-7xl w-full max-h-[90vh] h-[90vh] sm:h-auto p-0 overflow-hidden">
          {imageViewerUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/95 overflow-auto">
              <img 
                src={imageViewerUrl} 
                alt="Full size preview"
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 2rem)' }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 min-h-[44px] min-w-[44px] touch-manipulation z-10"
                onClick={() => setImageViewerOpen(false)}
                aria-label="Close image viewer"
              >
                <XIcon className="w-6 h-6 stroke-[3]" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

