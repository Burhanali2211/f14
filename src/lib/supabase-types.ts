import type { Database } from '@/integrations/supabase/types';

export type UserRole = 'admin' | 'uploader' | 'user';
export type EventType = 'birthday' | 'death' | 'martyrdom' | 'other';
export type ContactStatus = 'unread' | 'read' | 'replied' | 'archived';
export type PayoutStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type PaymentMethod = 'upi' | 'bank' | 'paytm';
export type GradientPreset = 'default' | 'emerald' | 'gold' | 'purple' | 'blue' | 'minimal' | 'none';
export type TextColorMode = 'auto' | 'light' | 'dark';

type Tables = Database['public']['Tables'];

export type UserProfile = Tables['users']['Row'];
export type UserProfileInsert = Tables['users']['Insert'];
export type UserProfileUpdate = Tables['users']['Update'];

export type Category = Tables['categories']['Row'];
export type CategoryInsert = Tables['categories']['Insert'];
export type CategoryUpdate = Tables['categories']['Update'];

export type Imam = Tables['imams']['Row'] & {
  category?: Category;
};
export type ImamInsert = Tables['imams']['Insert'];
export type ImamUpdate = Tables['imams']['Update'];

export type Piece = Tables['pieces']['Row'] & {
  category?: Category;
  imam?: Imam;
};
export type PieceInsert = Tables['pieces']['Insert'];
export type PieceUpdate = Tables['pieces']['Update'];

export type Artiste = Tables['artistes']['Row'];
export type ArtisteInsert = Tables['artistes']['Insert'];
export type ArtisteUpdate = Tables['artistes']['Update'];

export type SiteSettings = Tables['site_settings']['Row'];
export type SiteSettingsInsert = Tables['site_settings']['Insert'];
export type SiteSettingsUpdate = Tables['site_settings']['Update'];

export type AhlulBaitEvent = Tables['ahlul_bait_events']['Row'] & {
  imam?: Imam;
};
export type AhlulBaitEventInsert = Tables['ahlul_bait_events']['Insert'];
export type AhlulBaitEventUpdate = Tables['ahlul_bait_events']['Update'];

export type Announcement = Tables['announcements']['Row'] & {
  imam?: Imam;
};
export type AnnouncementInsert = Tables['announcements']['Insert'];
export type AnnouncementUpdate = Tables['announcements']['Update'];

export type ContactSubmission = Tables['contact_submissions']['Row'];
export type ContactSubmissionInsert = Tables['contact_submissions']['Insert'];
export type ContactSubmissionUpdate = Tables['contact_submissions']['Update'];

export type UploaderEarnings = Tables['uploader_earnings']['Row'];
export type UploaderEarningsInsert = Tables['uploader_earnings']['Insert'];
export type UploaderEarningsUpdate = Tables['uploader_earnings']['Update'];

export type PayoutRequest = Tables['payout_requests']['Row'] & {
  user?: UserProfile;
};
export type PayoutRequestInsert = Tables['payout_requests']['Insert'];
export type PayoutRequestUpdate = Tables['payout_requests']['Update'];

export type UserPaymentDetail = Tables['user_payment_details']['Row'];
export type UserPaymentDetailInsert = Tables['user_payment_details']['Insert'];
export type UserPaymentDetailUpdate = Tables['user_payment_details']['Update'];

export type PushSubscription = Tables['push_subscriptions']['Row'];
export type PushSubscriptionInsert = Tables['push_subscriptions']['Insert'];
export type PushSubscriptionUpdate = Tables['push_subscriptions']['Update'];

export type EarningSetting = Tables['earning_settings']['Row'];
export type EarningSettingInsert = Tables['earning_settings']['Insert'];
export type EarningSettingUpdate = Tables['earning_settings']['Update'];

export type Figure = Tables['figures']['Row'];
export type FigureInsert = Tables['figures']['Insert'];
export type FigureUpdate = Tables['figures']['Update'];
