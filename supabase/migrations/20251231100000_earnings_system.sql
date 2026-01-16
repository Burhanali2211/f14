-- Earning Settings Table (for admin configuration)
CREATE TABLE IF NOT EXISTS earning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploader Earnings Table (to track each uploader's earnings)
CREATE TABLE IF NOT EXISTS uploader_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_recitations INTEGER DEFAULT 0,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  pending_payout DECIMAL(12, 2) DEFAULT 0,
  paid_out DECIMAL(12, 2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_upload_date DATE,
  milestones_achieved TEXT[] DEFAULT '{}',
  weekly_uploads JSONB DEFAULT '{}',
  monthly_uploads JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Payout Requests Table
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payment_method TEXT,
  payment_details TEXT,
  notes TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploader_earnings_user_id ON uploader_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- Insert default earning settings
INSERT INTO earning_settings (setting_key, setting_value) 
VALUES ('rates', '{
  "perRecitation": 50,
  "bonusPerMilestone": 500,
  "currency": "INR",
  "currencySymbol": "₹",
  "minimumPayout": 500,
  "milestones": [
    {"id": "first_upload", "name": "First Steps", "requiredCount": 1, "bonus": 100, "icon": "🌟", "description": "Upload your first recitation"},
    {"id": "rising_star", "name": "Rising Star", "requiredCount": 10, "bonus": 500, "icon": "⭐", "description": "Upload 10 recitations"},
    {"id": "dedicated_uploader", "name": "Dedicated Uploader", "requiredCount": 25, "bonus": 1000, "icon": "🏆", "description": "Upload 25 recitations"},
    {"id": "content_champion", "name": "Content Champion", "requiredCount": 50, "bonus": 2500, "icon": "👑", "description": "Upload 50 recitations"},
    {"id": "master_contributor", "name": "Master Contributor", "requiredCount": 100, "bonus": 5000, "icon": "💎", "description": "Upload 100 recitations"},
    {"id": "legendary_uploader", "name": "Legendary Uploader", "requiredCount": 250, "bonus": 15000, "icon": "🔥", "description": "Upload 250 recitations"},
    {"id": "hall_of_fame", "name": "Hall of Fame", "requiredCount": 500, "bonus": 50000, "icon": "🏛️", "description": "Upload 500 recitations"}
  ]
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
