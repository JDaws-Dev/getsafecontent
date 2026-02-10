#!/bin/bash

# Generate PNG icons from SVG for Android TWA
# Requires: Inkscape or ImageMagick

# Using sips (macOS built-in) - works with PNG source
# Or use an online tool like https://realfavicongenerator.net

echo "To generate icons for Android TWA, you have several options:"
echo ""
echo "Option 1: Use an online tool"
echo "  1. Go to https://maskable.app/editor"
echo "  2. Upload your safetunes-icon.svg"
echo "  3. Adjust the safe zone"
echo "  4. Export as 512x512 PNG"
echo ""
echo "Option 2: Use Figma/Canva"
echo "  1. Create a 512x512 canvas"
echo "  2. Place your logo centered"
echo "  3. Export as PNG"
echo "  4. For maskable, add padding (logo should be ~80% of canvas)"
echo ""
echo "Option 3: Use ImageMagick (if installed)"
echo "  convert -background none -resize 512x512 ../public/safetunes-icon.svg ../public/safetunes-icon-512.png"
echo "  convert -background none -resize 192x192 ../public/safetunes-icon.svg ../public/safetunes-icon-192.png"
echo ""
echo "Required files to create in /public/:"
echo "  - safetunes-icon-192.png (192x192)"
echo "  - safetunes-icon-512.png (512x512)"
echo "  - safetunes-icon-maskable-192.png (192x192 with padding)"
echo "  - safetunes-icon-maskable-512.png (512x512 with padding)"
