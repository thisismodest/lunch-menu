#!/bin/sh

# Builds modest-ui.min.css from just the modest-ui components this site uses.
# The npm package is mdst-ui (the "modest-ui" package on npm is unrelated).
# Usage: sh scripts/build-modest-ui.sh [version]   (default: 2)
# Requires npm, npx, and jq.

set -e

VERSION="${1:-2}"
FILES="
  base/tokens.css
  base/reset.css
  components/typography/typography.css
  components/tag/tag.css
  components/button/button.css
  components/banner/banner.css
"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$REPO_ROOT/modest-ui.min.css"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

(cd "$TMP" && npm pack "mdst-ui@$VERSION" --silent >/dev/null && tar xzf mdst-ui-*.tgz)

PKG="$TMP/package"
RESOLVED="$(jq -r .version "$PKG/package.json")"

(cd "$PKG" && cat $FILES) > "$TMP/picked.css"
npx --yes lightningcss-cli --minify "$TMP/picked.css" -o "$TMP/picked.min.css"

{
  echo "/*! mdst-ui v$RESOLVED (modest-ui) | MIT | https://modest-ui.com | $(echo $FILES | xargs -n1 basename | sed 's/\.css$//' | paste -sd, -) */"
  cat "$TMP/picked.min.css"
  echo
} > "$OUT"

echo "Built modest-ui.min.css from mdst-ui v$RESOLVED ($(wc -c < "$OUT" | tr -d ' ') bytes)"
