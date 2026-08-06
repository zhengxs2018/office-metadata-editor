#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAC_BUNDLE="$ROOT/src-tauri/target/release/bundle"
WIN_BUILD="$ROOT/src-tauri/target/x86_64-pc-windows-gnu/release/bundle"
RELEASES="$ROOT/releases"

mkdir -p "$RELEASES"

shopt -s nullglob

# macOS DMG
for f in "$MAC_BUNDLE"/dmg/*.dmg; do
  cp "$f" "$RELEASES/"
  echo "✓ macOS DMG copied: $(basename "$f")"
done

# Windows NSIS installer
for f in "$WIN_BUILD"/nsis/*.exe; do
  cp "$f" "$RELEASES/"
  echo "✓ Windows installer copied: $(basename "$f")"
done

if [ -z "$(ls -A "$RELEASES" 2>/dev/null)" ]; then
  echo "No release files found in $BUNDLE"
  exit 1
fi

echo ""
echo "Release files:"
ls -lh "$RELEASES"
