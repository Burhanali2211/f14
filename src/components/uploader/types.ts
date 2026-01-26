import type { Category, Piece, Imam } from '@/lib/supabase-types';
import type { UploaderEarnings } from '@/lib/uploader-earnings';

export type ActiveSection = 'earnings' | 'recitations';

export interface DeletedPiece {
  piece: Piece;
  deletedAt: number;
}

export interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete';
  pieceId: string;
  pieceTitle: string;
  timestamp: number;
}

export interface PieceCardProps {
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

export interface UploaderSidebarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  recitationCount: number;
  earnings: UploaderEarnings | null;
}

export interface StatsPanelProps {
  statistics: {
    total: number;
    withImages: number;
    withVideos: number;
    byCategory: Record<string, number>;
    byLanguage: Record<string, number>;
  };
  filteredCount: number;
  onClose: () => void;
}

export interface FilterBarProps {
  categories: Category[];
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterLanguage: string;
  setFilterLanguage: (value: string) => void;
  sortBy: 'created_at' | 'title' | 'language';
  setSortBy: (value: 'created_at' | 'title' | 'language') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onAddRecitation: () => void;
}

export interface RecitationsListProps {
  pieces: Piece[];
  categories: Category[];
  imams: Imam[];
  deleting: string | null;
  selectedPieces: Set<string>;
  selectMode: boolean;
  onEdit: (piece: Piece) => void;
  onDelete: (piece: Piece) => void;
  onImageClick: (url: string) => void;
  onToggleSelect: (pieceId: string) => void;
  onCopyUrl: (piece: Piece) => void;
  onView: (piece: Piece) => void;
}

export interface RecentActivityProps {
  activities: Activity[];
  onClear: () => void;
}

export interface UploaderHeaderProps {
  activeSection: ActiveSection;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showStats: boolean;
  setShowStats: (value: boolean) => void;
  onExport: (format: 'csv' | 'json') => void;
  onRefresh: () => void;
  onShowHelp: () => void;
  loading: boolean;
  filteredCount: number;
}

export interface DeleteConfirmDialogProps {
  piece: Piece | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export interface KeyboardHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ImageViewerDialogProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface BulkSelectionBarProps {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

