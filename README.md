# School Lunch Menu Viewer

A simple, static page that shows the weekly school lunch menu provided by HCL. Built by a dad who kept forgetting what was for dinner.

## Files

| File / Directory              | Purpose                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `index.html`                  | The main page — no inline styles; inline scripts are only analytics and theme restore |
| `styles.css`                  | All custom styles (theme tokens, layout, components)                                  |
| `app.js`                      | All JavaScript (menu loading, date resolution, rendering)                             |
| `modest-ui.min.css`           | Trimmed [modest-ui](https://modest-ui.com) v2 build (see below)                       |
| `favicon.svg`                 | Fork & knife icon used as favicon and header logo                                     |
| `menus/`                      | Menu data as dated JSON files                                                         |
| `menus/index.json`            | Auto-generated manifest listing all menu files                                        |
| `scripts/build-menu-index.sh` | Script to regenerate `menus/index.json` from the menu files                           |
| `scripts/build-menu-xml.sh`   | Script to regenerate `menu.xml` from the menu files                                   |
| `scripts/build-modest-ui.sh`  | Script to rebuild `modest-ui.min.css` from the `mdst-ui` npm package                  |
| `.githooks/pre-commit`        | Pre-commit hook that runs both scripts when menu files are staged                     |
| `menu.xml`                    | Auto-generated menu for every school day by date, for tools that can't run JavaScript |

## How it works

Menu data lives in `menus/` as individual JSON files, each named with the date the menu starts (`YYYY-MM-DD.json`). On load, `app.js` fetches `menus/index.json` to discover available menus, then resolves which is current and which (if any) is upcoming based on today's date:

- **Current menu** — the latest file whose start date is ≤ today.
- **Next menu** — the file immediately after the current one, if it exists.

Only those two menu files are fetched, so old menus can stay in `menus/` as an archive.

When a next menu is available, a preview banner appears on the site so you can browse it before it goes live. The switchover is automatic — once the start date of the next menu arrives, it becomes the current menu. No manual steps needed.

## Menu JSON format

Each menu file follows this structure:

```json
{
  "label": "Summer 2026",
  "genericJacketToppings": ["Grated Cheese (v)", "Baked Beans (Ve)", "Beans & Cheese (v)"],
  "weeks": [
    {
      "week": 1,
      "weekStart": ["2026-04-13", "2026-05-05"],
      "days": {
        "monday": {
          "main": "Pork Sausages & Gravy",
          "veggie": "Lentil Bolognese Pasta Shells (Ve)",
          "sides": "Mashed Potatoes",
          "dessert": "Peach & Apple Crumble & Ice Cream (v)",
          "extraJacketToppings": ["Tuna Mayo"]
        }
      }
    }
  ]
}
```

| Field                        | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `label`                      | Friendly name shown in the preview banner and header |
| `genericJacketToppings`      | Base jacket potato toppings available every day      |
| `weeks`                      | Array of week objects (typically 3 on a rotation)    |
| `weeks[].week`               | Week number (1, 2, 3)                                |
| `weeks[].weekStart`          | Monday dates (`YYYY-MM-DD`) when this week applies   |
| `weeks[].days`               | Object with keys `monday` through `friday`           |
| `days[].main`                | Main meal option                                     |
| `days[].veggie`              | Vegetarian/vegan option                              |
| `days[].sides`               | Side dishes                                          |
| `days[].dessert`             | Dessert                                              |
| `days[].extraJacketToppings` | Day-specific jacket potato extras (use `[]` if none) |

## Adding a new menu

1. Create a new file in `menus/` named with the start date, e.g. `menus/2026-11-02.json`.
2. Stage and commit:

```sh
git add menus/2026-11-02.json
git commit -m "Add Autumn 2026 menu"
```

The pre-commit hook will automatically regenerate `menus/index.json` and `menu.xml` and include them in the commit. Push, and you're done — the site will show a preview banner immediately, and switch over on the start date.

### Enabling the pre-commit hook

The hook lives in `.githooks/` so it's version-controlled. Git doesn't pick it up automatically — enable it once per clone:

```sh
git config core.hooksPath .githooks
```

### Manually rebuilding the index and XML

If needed, you can regenerate both at any time:

```sh
sh scripts/build-menu-index.sh
sh scripts/build-menu-xml.sh
```

The index script scans `menus/` for all `*.json` files (excluding `index.json`), sorts them, and writes the manifest. Both require `jq`.

### menu.xml (for AI assistants and other tools)

The site draws the menu with JavaScript, so tools that only download the HTML (like most AI assistants' fetch tools) see an empty page. `menu.xml` lists every school day from the day it was built onwards, by date, with that day's menu, so a tool can look up a date directly. The page points to it in two places: a line in the menu container that `app.js` replaces, and a `<link rel="alternate">` in `<head>`.

It's rebuilt whenever a menu file is committed. Days before then drop off, and when a newer menu starts it takes over from the older one's dates.

## Testing a future date

In `app.js`, inside `init()`, there are commented-out lines for simulating specific dates:

```js
const now = new Date();
// const now = new Date("2026-10-28"); // half term — Summer 2026 active, no school week, preview banner visible
// const now = new Date("2026-11-02"); // switchover day — Winter 2026 becomes active (Week 1)
// const now = new Date("2027-01-04"); // after Christmas — Winter 2026 active (Week 1)
// const now = new Date("2027-02-08"); // mid-winter — Winter 2026 active (Week 3)
// const now = new Date("2027-04-12"); // after Easter — Winter 2026 still current, but no matching school week
```

Uncomment one (and comment out the live line) to test different scenarios.

## Notes

- The site must be served over HTTP (e.g. a local server or GitHub Pages) — opening `index.html` directly as a `file://` URL will fail because `fetch()` can't load local files. For local development: `python3 -m http.server 8080`
- The site is marked `noindex, nofollow` so it won't appear in search engines.
- It's not affiliated with any school or HCL — just a convenience tool.
- No build step, no frameworks, no dependencies beyond the single modest-ui CSS file.

## modest-ui

`modest-ui.min.css` is a trimmed build of [modest-ui](https://modest-ui.com) v2 containing only the parts this site uses (tokens, reset, typography, tag, button, banner). The npm package is **`mdst-ui`** — the `modest-ui` package on npm is an unrelated Vue library.

To update it, or after adding a component to the list in the script:

```sh
sh scripts/build-modest-ui.sh        # latest 2.x; pass a version to pin, e.g. 2.0.0
```

Requires npm and `jq`; minifies with `npx lightningcss-cli`. The site itself still has no build step.

How the site uses it:

- `.mdst-ui` is on `<body>`, which scopes modest-ui's reset and classless styles to the page.
- Page sections are spaced by modest-ui's flow spacing (`--mdst-flow-space` in `styles.css`). It only applies inside unclassed containers, which is why `<main>` has no class. Use the `hidden` attribute to remove a section without leaving a gap.
- Everything in `styles.css` sits outside modest-ui's cascade layer, so it always wins.
- Light and dark themes follow the device setting until someone uses the toggle in the header. Theme colours in `styles.css` are `light-dark()` pairs, so the toggle only sets `data-theme` on `<html>` (which sets `color-scheme`) and saves the choice in `localStorage`. A small script in `<head>` re-applies it before the first paint. Picking the device's own theme clears the choice. Browsers without `light-dark()` get the light theme and no toggle.
