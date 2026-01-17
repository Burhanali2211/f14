-- Add notification preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_token TEXT,
ADD COLUMN IF NOT EXISTS notification_permission_granted BOOLEAN DEFAULT false;

-- Create index for notification queries
CREATE INDEX IF NOT EXISTS idx_profiles_notifications_enabled 
ON public.profiles(notifications_enabled) 
WHERE notifications_enabled = true;
