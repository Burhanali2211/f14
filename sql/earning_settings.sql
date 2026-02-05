-- SQL Script for Earning Settings Table
-- Execute this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Create the earning_settings table
CREATE TABLE IF NOT EXISTS earning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default earning rates
INSERT INTO earning_settings (setting_key, setting_value)
VALUES (
  'rates',
  '{
    "perRecitation": 50,
    "bonusPerMilestone": 500,
    "currency": "INR",
    "currencySymbol": "₹",
    "minimumPayout": 500,
    "milestones": [
      {
        "id": "first_upload",
        "name": "First Steps",
        "requiredCount": 1,
        "bonus": 100,
        "icon": "🌟",
        "description": "Upload your first recitation"
      },
      {
        "id": "rising_star",
        "name": "Rising Star",
        "requiredCount": 10,
        "bonus": 500,
        "icon": "⭐",
        "description": "Upload 10 recitations"
      },
      {
        "id": "dedicated_uploader",
        "name": "Dedicated Uploader",
        "requiredCount": 25,
        "bonus": 1000,
        "icon": "🏆",
        "description": "Upload 25 recitations"
      },
      {
        "id": "content_champion",
        "name": "Content Champion",
        "requiredCount": 50,
        "bonus": 2500,
        "icon": "👑",
        "description": "Upload 50 recitations"
      },
      {
        "id": "master_contributor",
        "name": "Master Contributor",
        "requiredCount": 100,
        "bonus": 5000,
        "icon": "💎",
        "description": "Upload 100 recitations"
      },
      {
        "id": "legendary_uploader",
        "name": "Legendary Uploader",
        "requiredCount": 250,
        "bonus": 15000,
        "icon": "🔥",
        "description": "Upload 250 recitations"
      },
      {
        "id": "hall_of_fame",
        "name": "Hall of Fame",
        "requiredCount": 500,
        "bonus": 50000,
        "icon": "🏛️",
        "description": "Upload 500 recitations"
      }
    ]
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_earning_settings_key ON earning_settings(setting_key);

-- Verify the data was inserted
SELECT * FROM earning_settings;
