#!/bin/sh

# Generates menu.xml: every school day from today onwards, listed by date, so
# tools that can't run the site's JavaScript (e.g. AI assistants) can read the
# menu. Run from anywhere; the pre-commit hook runs it whenever menu files
# change. Requires jq.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MENUS_DIR="$REPO_ROOT/menus"
OUT="$REPO_ROOT/menu.xml"
TODAY="$(date +%Y-%m-%d)"

FILES=$(find "$MENUS_DIR" -maxdepth 1 -name '*.json' ! -name 'index.json' | sort)

if [ -z "$FILES" ]; then
  echo "Error: no menu files found in $MENUS_DIR" >&2
  exit 1
fi

# shellcheck disable=SC2086
DAYS=$(jq -nr --arg today "$TODAY" '
  def esc: tostring | gsub("&"; "&amp;") | gsub("<"; "&lt;") | gsub(">"; "&gt;") | gsub("\""; "&quot;");
  def day_secs: 86400;

  ["monday", "tuesday", "wednesday", "thursday", "friday"] as $names

  # Menu files are named by start date
  | [inputs | {start: (input_filename | split("/") | last | rtrimstr(".json")), menu: .}]
  | sort_by(.start)
  | . as $all

  | [
      range(0; length) as $i
      | $all[$i] as $m
      # A menu ends where the next one starts
      | ($all[$i + 1].start // "9999-12-31") as $end
      | $m.menu.weeks[] as $w
      | $w.weekStart[] as $start
      | ($start | strptime("%Y-%m-%d") | mktime) as $start_secs
      # weekStart can be a Tuesday after a bank holiday, so step back to Monday
      # and skip any days before the start
      | ($start_secs - ((($start_secs | gmtime | .[6]) + 6) % 7) * day_secs) as $monday
      | range(0; 5) as $d
      | ($monday + $d * day_secs) as $secs
      | ($secs | strftime("%Y-%m-%d")) as $date
      | select($date >= $start and $date < $end and $date >= $today)
      | $w.days[$names[$d]] as $meal
      | select($meal != null)
      | {
          date: $date,
          weekday: ($secs | strftime("%A")),
          label: $m.menu.label,
          week: $w.week,
          meal: $meal,
          jacket: (($m.menu.genericJacketToppings // []) + ($meal.extraJacketToppings // []))
        }
    ]
  | sort_by(.date)[]
  | "  <day date=\"\(.date)\" weekday=\"\(.weekday)\" menu=\"\(.label | esc)\" week=\"\(.week)\">",
    "    <main>\(.meal.main | esc)</main>",
    "    <veggie>\(.meal.veggie | esc)</veggie>",
    "    <sides>\(.meal.sides | esc)</sides>",
    "    <dessert>\(.meal.dessert | esc)</dessert>",
    "    <jacket-potato>\(.jacket | join(", ") | esc)</jacket-potato>",
    "  </day>"
' $FILES) || exit 1

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<!--'
  echo '  School lunch menu (HCL), one <day> per school day, by date.'
  echo '  Days that are not listed (weekends, holidays, INSET days) have no school lunch.'
  echo '  "main" is Main Meal 1 and "veggie" is Main Meal 2. (v) = vegetarian, (Ve) = vegan.'
  echo '  Not affiliated with any school or HCL, and may not be accurate.'
  echo '  Generated from menus/*.json by scripts/build-menu-xml.sh.'
  echo '-->'
  echo '<lunch-menus source="https://thisismodest.com/lunch-menu/">'
  echo "$DAYS"
  echo '</lunch-menus>'
} > "$OUT"

echo "Updated menu.xml: $(grep -c '<day ' "$OUT") school days"
