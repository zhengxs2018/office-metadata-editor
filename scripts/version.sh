#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: bash scripts/version.sh <new-version>"
  echo "Example: bash scripts/version.sh 0.3.0"
  exit 1
fi

# package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/package.json"
echo "✓ package.json → $VERSION"

# tauri.conf.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT/src-tauri/tauri.conf.json"
echo "✓ tauri.conf.json → $VERSION"

# Cargo.toml
sed -i '' "s/^version = \"[^\"]*\"/version = \"$VERSION\"/" "$ROOT/src-tauri/Cargo.toml"
echo "✓ Cargo.toml → $VERSION"

echo ""
echo "Version updated to $VERSION"
