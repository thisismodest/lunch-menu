# School Lunch Menu Viewer

A simple, static page that shows the weekly school lunch menu provided by HCL. Built by a dad who kept forgetting what was for dinner.

## Files

| File                | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `index.html`        | The main page — pure HTML, no inline styles or scripts                                |
| `styles.css`        | All custom styles (theme tokens, layout, components)                                  |
| `app.js`            | All JavaScript (menu data, rendering logic)                                           |
| `modest-ui.min.css` | Minified copy of [modest-ui](https://github.com/thisismodest/modest-ui) CSS framework |
| `favicon.svg`       | Fork & knife icon used as favicon and header logo                                     |

## Updating the menu

All menu data lives at the top of `app.js` in the `menuData` array. Each entry represents a week:

```js
{
  week: 1,                          // Week number (1, 2, 3)
  weekStart: ["2025-11-03", ...],   // Monday dates when this week applies (YYYY-MM-DD)
  jacketToppings: genericJacketToppings,  // Base jacket potato toppings for the week
  days: {
    monday: {
      main: "Beef Burger",
      veggie: "Frittata (v)",
      sides: "Potato Wedges or Pasta",
      dessert: "Apple Strudel & Custard (v)",
      extraJacketToppings: ["Tuna Mayo"],  // Day-specific extras (on top of the base set)
    },
    // tuesday, wednesday, thursday, friday...
  },
}
```

### What you'll typically need to update

1. **`weekStart` dates** — Add new Monday dates (as `YYYY-MM-DD` strings) to each week's `weekStart` array when the new term schedule comes out. If the current Monday doesn't match any entry, the site shows a "menu needs updating" message.

2. **Menu items** — Update `main`, `veggie`, `sides`, and `dessert` for each day if the menu changes.

3. **Jacket potato toppings** — The `genericJacketToppings` array at the top of the file holds the base toppings available every day. Per-day extras go in `extraJacketToppings` on each day object (use an empty array `[]` if there are none).

### Testing a future date

In `app.js`, inside the `init()` function, there's a commented-out line:

```js
// const now = new Date("2026-04-05");
```

Uncomment it (and comment out `const now = new Date();`) to simulate a specific date — useful for checking that week matching works or previewing the "menu needs updating" state.

## Notes

- The site is marked `noindex, nofollow` so it won't appear in search engines.
- It's not affiliated with any school or HCL — just a convenience tool.
- No build step, no frameworks, no dependencies beyond the single modest-ui CSS file.
