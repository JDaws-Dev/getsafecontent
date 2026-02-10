#!/bin/bash

# SafeTunes Convex Setup Script
# This script helps you get Convex running

echo "🎵 SafeTunes - Convex Setup"
echo "============================"
echo ""

# Check if convex is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js and npm detected"
echo ""

# Check if convex package is installed
if ! npm list convex &> /dev/null; then
    echo "❌ Convex package not installed. Running npm install..."
    npm install
else
    echo "✅ Convex package installed"
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Run this command to initialize Convex:"
echo "   npx convex dev"
echo ""
echo "2. When prompted, select 'create a new project' and name it 'safetunes'"
echo ""
echo "3. Copy the deployment URL that appears (looks like: https://xxxxx.convex.cloud)"
echo ""
echo "4. Create a .env file with:"
echo "   VITE_CONVEX_URL=https://xxxxx.convex.cloud"
echo ""
echo "5. In a NEW terminal, run:"
echo "   npm run dev"
echo ""
echo "6. Visit http://localhost:5173/ to see your app!"
echo ""
echo "Press Enter to start Convex initialization now, or Ctrl+C to do it later..."
read -r

echo ""
echo "Starting Convex dev..."
echo ""

# Run convex dev
npx convex dev
