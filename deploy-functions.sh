#!/bin/bash

echo "Deploying Supabase Edge Functions..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI is not installed!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "Deploying fetch-content function..."
supabase functions deploy fetch-content
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy fetch-content"
    exit 1
fi

echo ""
echo "Deploying ai-enhance function..."
supabase functions deploy ai-enhance
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy ai-enhance"
    exit 1
fi

echo ""
echo "Deploying translate function..."
supabase functions deploy translate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to deploy translate"
    exit 1
fi

echo ""
echo "========================================"
echo "Functions deployed successfully!"
echo "========================================"
echo ""
echo "IMPORTANT: Set environment variables in Supabase Dashboard:"
echo "  1. Go to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/settings/functions"
echo "  2. Add secret: LOVABLE_API_KEY (your API key)"
echo "  3. Optional: Add ALLOWED_ORIGINS (comma-separated list)"
echo ""

