-- User Payment Details Table
CREATE TABLE IF NOT EXISTS user_payment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'bank', 'paytm')),
  payment_details TEXT NOT NULL,
  account_holder_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, payment_method, payment_details)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_payment_details_user_id ON user_payment_details(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_details_default ON user_payment_details(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE user_payment_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using open policies since custom auth handles authorization at app level)
-- Allow public read (app-level auth will handle access control)
CREATE POLICY "Allow public read on user_payment_details" ON user_payment_details
  FOR SELECT USING (true);

-- Allow public insert (app-level auth will handle access control)
CREATE POLICY "Allow public insert on user_payment_details" ON user_payment_details
  FOR INSERT WITH CHECK (true);

-- Allow public update (app-level auth will handle access control)
CREATE POLICY "Allow public update on user_payment_details" ON user_payment_details
  FOR UPDATE USING (true);

-- Allow public delete (app-level auth will handle access control)
CREATE POLICY "Allow public delete on user_payment_details" ON user_payment_details
  FOR DELETE USING (true);

