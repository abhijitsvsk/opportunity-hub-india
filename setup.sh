#!/bin/bash
# Setup script for Opportunity Hub Data Pipeline

echo "========================================="
echo "Opportunity Hub Scraper - Setup"
echo "========================================="

# 1. Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js could not be found. Please install Node.js v18 or higher."
    exit 1
fi
echo "✅ Node.js is installed"

# 2. Install dependencies
echo "📦 Installing npm dependencies..."
cd scraper || exit
npm install

# 3. Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium

# 4. Setup environment variables
if [ ! -f .env ]; then
    echo "🔑 Creating .env from template..."
    cat <<EOF > .env
GEMINI_API_KEY=your_gemini_flash_key
SUPABASE_URL=https://uxmsilsspwdrheweqvpn.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
EOF
    echo "⚠️  IMPORTANT: A new .env file has been created in the scraper/ directory."
    echo "   Please open scraper/.env and add your actual API keys."
else
# 5. Validate Environment
echo "🔍 Validating environment..."
node validate-env.js

echo "========================================="
echo "Setup Complete!"
echo "To run the pipeline locally:"
echo "  cd scraper"
echo "  node pipeline.js"
echo "========================================="
