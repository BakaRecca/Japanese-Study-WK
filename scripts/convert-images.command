#!/bin/zsh

# Double-click helper for macOS.
# Converts PNG files under assets/images into WebP files.
# Existing WebP files are skipped by convert-images.py.

cd "$(dirname "$0")/.." || exit 1

python3 scripts/convert-images.py

echo ""
echo "Done. You can close this window."
read -k 1 "?Press any key to close..."