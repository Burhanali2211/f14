import type { Category, Piece, Imam, UserProfile, Artiste, AhlulBaitEvent, EventType } from '@/lib/supabase-types';

export interface PieceForm {
  title: string;
  category_id: string;
  imam_id: string;
  reciter: string;
  language: string;
  text_content: string;
  video_url: string;
  image_url: string;
}

export interface ImamForm {
  name: string;
  slug: string;
  description: string;
  title: string;
  order_index: number;
}

export interface EventForm {
  event_name: string;
  event_date: string;
  hijri_date: string;
  event_type: EventType;
  imam_id: string;
  description: string;
  is_annual: boolean;
}

export interface UserForm {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  address: string;
  role: 'admin' | 'uploader' | 'user';
}

export interface DeleteDialogState {
  type: 'category' | 'piece' | 'imam' | 'event' | 'artiste';
  id: string;
}

export interface AdminDataState {
  categories: Category[];
  pieces: Piece[];
  imams: Imam[];
  artistes: Artiste[];
  userProfiles: UserProfile[];
  events: AhlulBaitEvent[];
}

export interface RecitationsTabProps {
  pieces: Piece[];
  categories: Category[];
  imams: Imam[];
  onNavigate: (path: string) => void;
  onDelete: (type: 'piece', id: string) => void;
}

export interface CategoriesTabProps {
  categories: Category[];
  onOpenForm: (category?: Category) => void;
  onDelete: (type: 'category', id: string) => void;
}

export interface ImamsTabProps {
  imams: Imam[];
  onOpenDialog: (imam?: Imam) => void;
  onDelete: (type: 'imam', id: string) => void;
}

export interface ArtistesTabProps {
  artistes: Artiste[];
  onOpenImageDialog: (artiste: Artiste) => void;
  onDelete: (type: 'artiste', id: string) => void;
}

export interface EventsTabProps {
  events: AhlulBaitEvent[];
  imams: Imam[];
  onOpenDialog: (event?: AhlulBaitEvent) => void;
  onDelete: (type: 'event', id: string) => void;
}

export interface UsersTabProps {
  userProfiles: UserProfile[];
  currentUserId?: string;
  onOpenDialog: (user?: UserProfile) => void;
}

export interface ImamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingImam: Imam | null;
  form: ImamForm;
  onFormChange: (form: ImamForm) => void;
  onSave: () => void;
}

export interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: AhlulBaitEvent | null;
  form: EventForm;
  onFormChange: (form: EventForm) => void;
  onSave: () => void;
  imams: Imam[];
}

export interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: UserProfile | null;
  isAdding: boolean;
  form: UserForm;
  onFormChange: (form: UserForm) => void;
  onSave: () => void;
}

export interface ArtisteImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedArtiste: Artiste | null;
  imageFile: File | null;
  imagePreview: string | null;
  uploading: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
}

export interface DeleteConfirmDialogProps {
  dialog: DeleteDialogState | null;
  onClose: () => void;
  onConfirm: () => void;
}

