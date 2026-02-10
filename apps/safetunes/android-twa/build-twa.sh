#!/bin/bash

# SafeTunes Android TWA Build Script
# Run this script in your terminal (not through Claude)

set -e

echo "======================================"
echo "  SafeTunes Android TWA Builder"
echo "======================================"
echo ""

# Set Java path
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"

# Verify Java
echo "Checking Java..."
java -version
echo ""

# Navigate to android-twa directory
cd "$(dirname "$0")"

echo "Starting Bubblewrap..."
echo ""
echo "IMPORTANT: Answer the prompts as follows:"
echo "  - Install JDK? -> n (No, use existing)"
echo "  - Path to JDK? -> /opt/homebrew/opt/openjdk@17"
echo "  - Install Android SDK? -> Y (Yes)"
echo "  - For other prompts, press Enter to accept defaults"
echo "  - Application ID: com.getsafetunes.app"
echo "  - Key alias: safetunes"
echo "  - Passwords: Create and remember your own (e.g., SafeTunes2024!)"
echo ""
echo "Press Enter to continue..."
read

npx @bubblewrap/cli init --manifest https://getsafetunes.com/manifest.json

echo ""
echo "======================================"
echo "  Building APK..."
echo "======================================"
echo ""

npx @bubblewrap/cli build

echo ""
echo "======================================"
echo "  BUILD COMPLETE!"
echo "======================================"
echo ""
echo "Your APK is at: ./app-release-signed.apk"
echo ""
echo "Next steps:"
echo "1. Transfer APK to Android device"
echo "2. Enable 'Install from unknown sources'"
echo "3. Install the APK"
echo ""
echo "To get the signing fingerprint for assetlinks.json:"
echo "  keytool -list -v -keystore ./safetunes.keystore -alias safetunes"
echo ""
