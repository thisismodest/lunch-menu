# School Lunch Menu Viewer

A simple, static page that shows the weekly school lunch menu provided by HCL. Built by a dad who kept forgetting what was for dinner.

## Files

| File / Directory              | Purpose                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `index.html`                  | The main page — pure HTML, no inline styles or scripts                                |
| `styles.css`                  | All custom styles (theme tokens, layout, components)                                  |
| `app.js`                      | All JavaScript (menu loading, date resolution, rendering)                             |
| `modest-ui.min.css`           | Minified copy of [modest-ui](https://github.com/thisismodest/modest-ui) CSS framework |
| `favicon.svg`                 | Fork & knife icon used as favicon and header logo                                     |
| `menus/`                      | Menu data as dated JSON files                                                         |
| `menus/index.json`            | Auto-generated manifest listing all menu files                                        |
| `scripts/build-menu-index.sh` | Script to regenerate `menus/index.json` from the menu files                           |

## How it works

Menu data lives in `menus/` as individual JSON files, each named with the date the menu starts (`YYYY-MM-DD.json`). On load, `app.js` fetches `menus/index.json` to discover available menus, then resolves which is current and which (if any) is upcoming based on today's date:

- **Current menu** — the latest file whose start date is ≤ today.
- **Next menu** — the file immediately after the current one, if it exists.

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

The pre-commit hook will automatically regenerate `menus/index.json` and include it in the commit. Push, and you're done — the site will show a preview banner immediately, and switch over on the start date.

### Manually rebuilding the index

If needed, you can regenerate `menus/index.json` at any time:

```sh
sh scripts/build-menu-index.sh
```

This scans `menus/` for all `*.json` files (excluding `index.json`), sorts them, and writes the manifest. Requires `jq`.

## Testing a future date

In `app.js`, inside `init()`, there are commented-out lines for simulating specific dates:

```js
const now = new Date();
// const now = new Date("2026-04-05"); // between menus — current active, preview banner visible
// const now = new Date("2026-04-13"); // switchover day — Summer 2026 becomes active (Week 1)
// const now = new Date("2026-06-15"); // mid-summer — Summer 2026 active (Week 3)
// const now = new Date("2026-11-01"); // past all menus — "needs updating" message
```

Uncomment one (and comment out the live line) to test different scenarios.

## Notes

- The site must be served over HTTP (e.g. a local server or GitHub Pages) — opening `index.html` directly as a `file://` URL will fail because `fetch()` can't load local files. For local development: `python3 -m http.server 8080`
- The site is marked `noindex, nofollow` so it won't appear in search engines.
- It's not affiliated with any school or HCL — just a convenience tool.
- No build step, no frameworks, no dependencies beyond the single modest-ui CSS file.
