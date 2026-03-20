#!/bin/sh

# Generates menus/index.json from the dated JSON files in menus/
# Run from the repo root, or it will auto-detect the right directory.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MENUS_DIR="$REPO_ROOT/menus"

if [ ! -d "$MENUS_DIR" ]; then
  echo "Error: menus/ directory not found at $MENUS_DIR" >&2
  exit 1
fi

# Find all JSON files except index.json, extract filenames, sort, and build the array
INDEX=$(find "$MENUS_DIR" -maxdepth 1 -name '*.json' ! -name 'index.json' -exec basename {} \; | sort | jq -R . | jq -s .)

if [ "$INDEX" = "[]" ]; then
  echo "Warning: no menu files found in $MENUS_DIR" >&2
fi

echo "$INDEX" > "$MENUS_DIR/index.json"
echo "Updated menus/index.json: $INDEX"
