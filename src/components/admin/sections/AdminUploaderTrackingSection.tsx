import { memo, useState, useEffect, useMemo } from 'react';
import { 
  Upload, User, FileText, Trash2, Eye, Edit2, 
  ChevronDown, ChevronUp, Search, Filter, 
  TrendingUp, Award, DollarSign, Calendar,
  BarChart3, Clock, CheckCircle2, XCircle,
  RefreshCw, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, authenticatedQuery } from '@/lib/db-utils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatCurrency, getEarningRate, type UploaderEarnings, type EarningRate } from '@/lib/uploader-earnings';
import { getKarbalaPlaceholder, getFirstImageUrl } from '@/lib/utils';
import type { Piece, UserProfile } from '@/lib/supabase-types';

interface UploaderWithStats extends UserProfile {
  uploadCount: number;
  earnings?: UploaderEarnings;
  pieces: Piece[];
}

export const AdminUploaderTrackingSection = memo(() => {
  const navigate = useNavigate();
  const { userProfiles, pieces, categories, imams, handleDelete, fetchData } = useAdmin();
  const [uploaders, setUploaders] = useState<UploaderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUploader, setExpandedUploader] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'uploads' | 'earnings' | 'recent'>('uploads');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingPiece, setViewingPiece] = useState<Piece | null>(null);
  const [earningRate, setEarningRate] = useState<EarningRate>(getEarningRate());

  // Fetch uploader data with earnings
  useEffect(() => {
    const fetchUploaderData = async () => {
      try {
        setLoading(true);
        
        // Get all users with uploader role
        const uploaderUsers = userProfiles.filter(u => u.role === 'uploader');
        
        // Fetch earnings for all uploaders
        const { data: earningsData } = await safeQuery(async () =>
          await supabase.from('uploader_earnings').select('*')
        );
        
        const earningsMap = new Map<string, UploaderEarnings>();
        if (earningsData) {
          for (const e of earningsData) {
            earningsMap.set(e.user_id, {
              id: e.id,
              userId: e.user_id,
              totalRecitations: e.total_recitations || 0,
              totalEarnings: parseFloat(e.total_earnings) || 0,
              pendingPayout: parseFloat(e.pending_payout) || 0,
              paidOut: parseFloat(e.paid_out) || 0,
              currentStreak: e.current_streak || 0,
              longestStreak: e.longest_streak || 0,
              lastUploadDate: e.last_upload_date,
              milestonesAchieved: e.milestones_achieved || [],
              weeklyUploads: e.weekly_uploads || {},
              monthlyUploads: e.monthly_uploads || {},
              createdAt: e.created_at,
              updatedAt: e.updated_at,
            });
          }
        }
        
        // Create uploader stats
        const uploadersWithStats: UploaderWithStats[] = uploaderUsers.map(user => {
          const userPieces = pieces.filter(p => p.user_id === user.id);
          return {
            ...user,
            uploadCount: userPieces.length,
            earnings: earningsMap.get(user.id),
            pieces: userPieces,
          };
        });
        
        setUploaders(uploadersWithStats);
      } catch (error) {
        logger.error('Error fetching uploader data:', error);
        toast({ title: 'Error', description: 'Failed to load uploader data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchUploaderData();
  }, [userProfiles, pieces]);

  // Filter and sort uploaders
  const filteredUploaders = useMemo(() => {
    let result = [...uploaders];
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'uploads':
          return b.uploadCount - a.uploadCount;
        case 'earnings':
          return (b.earnings?.totalEarnings || 0) - (a.earnings?.totalEarnings || 0);
        case 'recent':
          const dateA = a.earnings?.lastUploadDate || a.created_at;
          const dateB = b.earnings?.lastUploadDate || b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [uploaders, searchQuery, sortBy]);

  // Calculate totals
  const totals = useMemo(() => ({
    uploaders: uploaders.length,
    totalUploads: uploaders.reduce((sum, u) => sum + u.uploadCount, 0),
    totalEarnings: uploaders.reduce((sum, u) => sum + (u.earnings?.totalEarnings || 0), 0),
    pendingPayouts: uploaders.reduce((sum, u) => sum + (u.earnings?.pendingPayout || 0), 0),
    paidOut: uploaders.reduce((sum, u) => sum + (u.earnings?.paidOut || 0), 0),
  }), [uploaders]);

  const handleDeletePiece = async () => {
    if (deleteId) {
      const success = await handleDelete('piece', deleteId);
      if (success) {
        setDeleteId(null);
        // Refresh uploader data
        await fetchData();
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
    toast({ title: 'Refreshed', description: 'Uploader data has been refreshed' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-card animate-pulse rounded-xl border" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-card animate-pulse rounded-xl border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{totals.uploaders}</p>
              <p className="text-xs text-muted-foreground">Uploaders</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{totals.totalUploads}</p>
              <p className="text-xs text-muted-foreground">Total Uploads</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.totalEarnings, earningRate)}</p>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.pendingPayouts, earningRate)}</p>
              <p className="text-xs text-muted-foreground">Pending Payouts</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.paidOut, earningRate)}</p>
              <p className="text-xs text-muted-foreground">Paid Out</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'uploads' | 'earnings' | 'recent')}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uploads">Most Uploads</SelectItem>
            <SelectItem value="earnings">Highest Earnings</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleRefresh} className="rounded-xl" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Uploaders List */}
      <div className="space-y-3 w-full overflow-x-hidden">
        {filteredUploaders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No uploaders found</p>
            <p className="text-sm text-muted-foreground/80">
              {searchQuery ? 'Try a different search term' : 'Create users with uploader role to start tracking'}
            </p>
          </div>
        ) : (
          filteredUploaders.map((uploader) => {
            const isExpanded = expandedUploader === uploader.id;
            const category = uploader.pieces[0] ? categories.find(c => c.id === uploader.pieces[0].category_id) : null;
            
            return (
              <div 
                key={uploader.id}
                className="bg-card rounded-xl border shadow-sm w-full"
              >
                {/* Uploader Header */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedUploader(isExpanded ? null : uploader.id)}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {uploader.full_name || 'Unnamed Uploader'}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex-shrink-0">
                          Uploader
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{uploader.email}</p>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="text-center min-w-[50px] sm:min-w-[60px]">
                      <p className="text-lg sm:text-xl font-bold text-foreground">{uploader.uploadCount}</p>
                      <p className="text-xs text-muted-foreground">Uploads</p>
                    </div>
                    <div className="text-center min-w-[70px] sm:min-w-[80px]">
                      <p className="text-lg sm:text-xl font-bold text-emerald-600 truncate">
                        {formatCurrency(uploader.earnings?.totalEarnings || 0, earningRate)}
                      </p>
                      <p className="text-xs text-muted-foreground">Earned</p>
                    </div>
                    <div className="text-center min-w-[50px] sm:min-w-[60px]">
                      <p className="text-lg sm:text-xl font-bold text-purple-600">
                        {uploader.earnings?.currentStreak || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-3 sm:p-4 space-y-3 sm:space-y-4 w-full overflow-x-hidden">
                    {/* Detailed Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
                      <div className="bg-background rounded-lg p-2 sm:p-3 border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">Milestones</span>
                        </div>
                        <p className="font-semibold text-sm sm:text-base truncate">{uploader.earnings?.milestonesAchieved?.length || 0}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 sm:p-3 border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">Pending</span>
                        </div>
                        <p className="font-semibold text-sm sm:text-base truncate">{formatCurrency(uploader.earnings?.pendingPayout || 0, earningRate)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 sm:p-3 border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">Paid Out</span>
                        </div>
                        <p className="font-semibold text-sm sm:text-base truncate">{formatCurrency(uploader.earnings?.paidOut || 0, earningRate)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 sm:p-3 border min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">Last Upload</span>
                        </div>
                        <p className="font-semibold text-xs sm:text-sm truncate">{formatDate(uploader.earnings?.lastUploadDate || null)}</p>
                      </div>
                    </div>

                    {/* Uploaded Pieces */}
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2 sm:mb-3 w-full">
                        <h4 className="font-medium text-sm sm:text-base text-foreground flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Uploaded Recitations ({uploader.pieces.length})</span>
                        </h4>
                      </div>
                      
                      {uploader.pieces.length === 0 ? (
                        <div className="text-center py-6 sm:py-8 bg-background rounded-lg border w-full">
                          <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No uploads yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto overflow-x-hidden w-full pr-1 sm:pr-2">
                          {uploader.pieces.map((piece) => {
                            const pieceCategory = categories.find(c => c.id === piece.category_id);
                            const pieceImam = imams.find(i => i.id === piece.imam_id);
                            
                            return (
                              <div 
                                key={piece.id}
                                className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-background rounded-lg border hover:border-primary/50 transition-colors w-full min-w-0"
                              >
                                <img 
                                  src={getFirstImageUrl(piece.image_url) || getKarbalaPlaceholder(piece.id)}
                                  alt={piece.title}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getKarbalaPlaceholder(piece.id);
                                  }}
                                />
                                <div className="flex-1 min-w-0 overflow-hidden pr-1 sm:pr-2">
                                  <h5 className="font-medium text-sm sm:text-base text-foreground truncate w-full">{piece.title}</h5>
                                  <p className="text-xs text-muted-foreground truncate w-full">
                                    {pieceCategory?.name}
                                    {pieceImam && ` • ${pieceImam.name}`}
                                    {` • ${piece.language}`}
                                    {piece.reciter && ` • ${piece.reciter}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground/60 mt-0.5 truncate w-full">
                                    {formatDate(piece.created_at)} • {piece.view_count} views
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingPiece(piece);
                                    }}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
                                    title="View"
                                  >
                                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/admin/piece/${piece.id}/edit`);
                                    }}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteId(piece.id);
                                    }}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg text-destructive hover:text-destructive"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this recitation and affect the uploader's earnings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePiece} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Piece Dialog */}
      <Dialog open={!!viewingPiece} onOpenChange={() => setViewingPiece(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingPiece?.title}</DialogTitle>
          </DialogHeader>
          {viewingPiece && (
            <div className="space-y-4">
              {viewingPiece.image_url && (
                <img 
                  src={getFirstImageUrl(viewingPiece.image_url) || ''}
                  alt={viewingPiece.title}
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{categories.find(c => c.id === viewingPiece.category_id)?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Imam/Figure</p>
                  <p className="font-medium">{imams.find(i => i.id === viewingPiece.imam_id)?.name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="font-medium">{viewingPiece.language}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reciter</p>
                  <p className="font-medium">{viewingPiece.reciter || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p className="font-medium">{viewingPiece.view_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(viewingPiece.created_at)}</p>
                </div>
              </div>
              
              {viewingPiece.video_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Video URL</p>
                  <a 
                    href={viewingPiece.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {viewingPiece.video_url}
                  </a>
                </div>
              )}
              
              <div>
                <p className="text-xs text-muted-foreground mb-2">Content</p>
                <div className="bg-accent/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewingPiece.text_content}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    navigate(`/admin/piece/${viewingPiece.id}/edit`);
                    setViewingPiece(null);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Recitation
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setDeleteId(viewingPiece.id);
                    setViewingPiece(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

AdminUploaderTrackingSection.displayName = 'AdminUploaderTrackingSection';

