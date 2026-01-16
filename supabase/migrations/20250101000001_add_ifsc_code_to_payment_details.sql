-- Add IFSC code column to user_payment_details table
ALTER TABLE user_payment_details 
ADD COLUMN IF NOT EXISTS ifsc_code TEXT;

-- Drop the existing unique constraint if it exists (it might be a constraint or index)
DO $$ 
BEGIN
  -- Try to drop as a constraint first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_payment_details_user_id_payment_method_payment_details_key'
  ) THEN
    ALTER TABLE user_payment_details 
    DROP CONSTRAINT user_payment_details_user_id_payment_method_payment_details_key;
  END IF;
  
  -- Try to drop as an index
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'user_payment_details_user_id_payment_method_payment_details_key'
  ) THEN
    DROP INDEX IF EXISTS user_payment_details_user_id_payment_method_payment_details_key;
  END IF;
END $$;

-- Add a new unique constraint that considers ifsc_code for bank payments
-- This allows multiple bank accounts with different IFSC codes
CREATE UNIQUE INDEX IF NOT EXISTS user_payment_details_unique_bank 
ON user_payment_details(user_id, payment_method, payment_details, COALESCE(ifsc_code, ''))
WHERE payment_method = 'bank';

-- For non-bank payments, keep the original unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS user_payment_details_unique_non_bank 
ON user_payment_details(user_id, payment_method, payment_details)
WHERE payment_method != 'bank';

