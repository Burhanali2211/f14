export type UserRole = 'admin' | 'uploader' | 'user';

export interface UserProfile {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  notifications_enabled?: boolean;
  notification_token?: string | null;
  notification_permission_granted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploaderPermission {
  id: string;
  user_id: string;
  category_id: string | null;
  imam_id: string | null;
  created_at: string;
  category?: Category;
  imam?: Imam;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  bg_image_url: string | null;
  bg_image_position: string | null;
  bg_image_size: string | null;
  bg_image_opacity: number | null;
  bg_image_blur: number | null;
  bg_image_scale: number | null;
  created_at: string;
}

export interface Imam {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  category_id: string | null;
  created_at: string;
  category?: Category;
}

export interface Piece {
  id: string;
  title: string;
  category_id: string;
  imam_id: string | null;
  reciter: string | null;
  language: string;
  text_content: string;
  audio_url: string | null;
  video_url: string | null;
  image_url: string | null;
  tags: string[];
  view_count: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  imam?: Imam;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  site_tagline: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_gradient_opacity: number | null;
  hero_image_opacity: number | null;
  hero_gradient_preset: string | null;
  hero_badge_text: string | null;
  hero_heading_line1: string | null;
  hero_heading_line2: string | null;
  hero_description: string | null;
  hero_text_color_mode: string | null;
  created_at: string;
  updated_at: string;
}

export type GradientPreset = 'default' | 'emerald' | 'gold' | 'purple' | 'blue' | 'minimal' | 'none';
export type TextColorMode = 'auto' | 'light' | 'dark';

export type EventType = 'birthday' | 'death' | 'martyrdom' | 'other';

export interface AhlulBaitEvent {
  id: string;
  imam_id: string;
  event_type: EventType;
  event_date: string;
  event_name: string;
  description: string | null;
  is_annual: boolean;
  created_at: string;
  updated_at: string;
  imam?: Imam;
}

export interface Artiste {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  event_type?: EventType | 'general' | null;
  imam_id?: string | null;
  event_date?: string | null;
  hijri_date?: string | null;
  template_data?: any;
}
