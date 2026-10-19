const weekdayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const mealRows = [
  { key: "main", label: "Main 1", dot: "red" },
  { key: "veggie", label: "Main 2", dot: "green" },
  { key: "sides", label: "Sides", dot: "muted" },
  { key: "dessert", label: "Dessert", dot: "muted", highlight: true },
];

const menus = {};
let currentMenuKey = null;
let nextMenuKey = null;
let activeMenuKey = null;
let activeWeekNumber = null;
let currentWeekNumber = null;
let isPreview = false;
let appDate = null;

// Dates

// YYYY-MM-DD in local time. toISOString() gives the UTC date, which is
// still yesterday for the first hour after midnight during BST.
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parse YYYY-MM-DD as local midnight (a bare date string parses as UTC).
function parseDateKey(key) {
  return new Date(`${key}T00:00`);
}

function getMonday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateKey(d);
}

// Menus

function getMenuStartDate(filename) {
  return filename.replace(".json", "");
}

function getMenuLabel(key) {
  return menus[key]?.label || getMenuStartDate(key);
}

// The index is sorted by start date (see scripts/build-menu-index.sh), so the
// current menu is the last one that has started and the next is the one after.
function resolveMenuKeys(index) {
  const today = toDateKey(appDate);
  const currentIdx = index.findLastIndex((filename) => getMenuStartDate(filename) <= today);
  currentMenuKey = index[currentIdx] ?? null;
  nextMenuKey = index[currentIdx + 1] ?? null;
}

function getActiveMenu() {
  return menus[activeMenuKey] || null;
}

function getMenuData() {
  return getActiveMenu()?.weeks || [];
}

function getWeekByNumber(num) {
  return getMenuData().find((w) => w.week === num) || null;
}

function resolveActiveWeek() {
  const menuData = getMenuData();
  if (!menuData.length) return;

  if (isPreview) {
    currentWeekNumber = null;
  } else {
    // Compare Mondays so that weeks starting on a Tuesday (after a bank
    // holiday) still match.
    const monday = getMonday(appDate);
    const currentWeek = menuData.find((w) => w.weekStart.some((ws) => getMonday(parseDateKey(ws)) === monday));
    currentWeekNumber = currentWeek?.week ?? null;
  }

  activeWeekNumber = currentWeekNumber || menuData[0].week;
}

// Markup helpers

function tag(text, modifiers = "") {
  return `<span class="mdst-tag mdst-tag--sm mdst-tag--pill ${modifiers}">${text}</span>`;
}

function message(title, body, modifier = "") {
  return `
    <div class="message-block ${modifier}">
      <h3 class="mdst-h3">${title}</h3>
      <p class="mdst-p mdst-p--muted">${body}</p>
    </div>`;
}

// Rendering

function renderMealContent(meal, baseJacketToppings) {
  if (!meal) {
    return `<p class="mdst-p mdst-p--sm mdst-p--muted">Menu not available.</p>`;
  }

  let html = mealRows
    .map(({ key, label, dot, highlight }) => {
      const value = highlight ? `<mark class="mdst-mark">${meal[key]}</mark>` : meal[key];
      return `
        <div class="meal-row">
          <span class="meal-dot meal-dot--${dot}"></span>
          <span class="meal-label">${label}</span>
          <span class="meal-value">${value}</span>
        </div>`;
    })
    .join("");

  const extras = meal.extraJacketToppings || [];

  if (baseJacketToppings.length || extras.length) {
    const toppings = [
      ...baseJacketToppings.map((t) => tag(t)),
      ...extras.map((t) => tag(t, "mdst-tag--solid")),
    ].join("");

    html += `
      <div class="jacket-section">
        <div class="jacket-header">
          <span class="meal-dot meal-dot--yellow"></span>
          <span class="meal-label meal-label--auto">Jacket Potato</span>
        </div>
        <div class="jacket-toppings">${toppings}</div>
      </div>`;
  }

  return html;
}

function renderDayCard(dayName, meal, state, baseJacketToppings) {
  const displayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const stateTags = {
    past: tag("Done", "mdst-tag--muted"),
    today: tag("Today", "mdst-tag--solid mdst-tag--success"),
  };

  return `
    <div id="card-row-${dayName}" class="day-card day-card--${state}">
      <div class="day-card-header">
        <h4 class="mdst-h4">${displayName}</h4>
        ${stateTags[state] || ""}
      </div>
      <hr class="mdst-hr mdst-hr--flush day-card-divider" />
      ${renderMealContent(meal, baseJacketToppings)}
    </div>`;
}

function renderWeekLabel() {
  let label;
  if (isPreview) {
    label = tag(`Preview: ${getMenuLabel(nextMenuKey)}`, "mdst-tag--warning");
  } else if (currentWeekNumber) {
    label = tag(`Week ${currentWeekNumber}`, "mdst-tag--subtle");
  } else {
    label = tag("No active school week", "mdst-tag--muted");
  }
  document.getElementById("week-label").innerHTML = label;
}

function renderPreviewBanner() {
  const banner = document.getElementById("preview-banner");

  banner.hidden = !nextMenuKey;
  if (!nextMenuKey) return;

  const label = `<strong>${getMenuLabel(nextMenuKey)}</strong>`;
  const [text, action] = isPreview
    ? [`${tag("Preview", "mdst-tag--warning")} You're viewing the upcoming ${label} menu`, "Back to current menu"]
    : [`Next menu available: ${label}`, "Preview"];

  banner.innerHTML = `
    <div class="mdst-banner preview-banner">
      <span class="mdst-banner__content">${text}</span>
      <div class="mdst-banner__actions">
        <button class="mdst-button mdst-button--sm">${action}</button>
      </div>
    </div>`;
}

function renderWeekSelector() {
  const menuData = getMenuData();
  const selector = document.getElementById("week-selector");

  selector.hidden = !menuData.length;
  selector.innerHTML = menuData
    .map((w) => {
      const pressed = w.week === activeWeekNumber;
      const currentLabel = w.week === currentWeekNumber ? tag("Current", "mdst-tag--success week-selector-current") : "";
      return `<button class="mdst-button mdst-button--sm" aria-pressed="${pressed}" data-week="${w.week}">Week ${w.week}${currentLabel}</button>`;
    })
    .join("");
}

function renderMenu() {
  const container = document.getElementById("menu-container");

  if (!getActiveMenu()) {
    container.innerHTML = message(
      "Whoopsie! Latest menu needs updating.",
      "The current week doesn't match any menu on file.<br />Check back soon, it'll be updated shortly (maybe)!",
    );
    return;
  }

  const weekData = getWeekByNumber(activeWeekNumber);

  if (!weekData) {
    container.innerHTML = message("Menu Not Found", "This week's menu isn't available.");
    return;
  }

  // Monday is 0, weekends fall outside 0–4
  const todayIndex = appDate.getDay() - 1;
  const isWeekday = todayIndex >= 0 && todayIndex < weekdayNames.length;
  const isCurrentWeek = activeWeekNumber === currentWeekNumber;
  const baseJacketToppings = getActiveMenu().genericJacketToppings || [];
  let html = "";

  if (isCurrentWeek && !isWeekday) {
    html += message(
      "It's the weekend! 🎉",
      "No school lunch today. Here's the menu for this week.",
      "message-block--weekend",
    );
  }

  const cards = weekdayNames.map((day, i) => {
    let state = "upcoming";
    if (isCurrentWeek && isWeekday) {
      if (i < todayIndex) state = "past";
      else if (i === todayIndex) state = "today";
    }
    return renderDayCard(day, weekData.days[day] || null, state, baseJacketToppings);
  });

  html += `<div class="week-row">${cards.join("")}</div>`;
  container.innerHTML = html;
}

function render() {
  renderWeekLabel();
  renderPreviewBanner();
  renderWeekSelector();
  renderMenu();
}

// Actions

function togglePreview() {
  isPreview = !isPreview;
  activeMenuKey = isPreview ? nextMenuKey : currentMenuKey;
  resolveActiveWeek();
  render();
}

function showWeek(weekNumber) {
  activeWeekNumber = weekNumber;
  renderWeekSelector();
  renderMenu();
}

// Init

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function init() {
  const now = new Date();
  // const now = new Date("2026-10-28"); // half term — Summer 2026 active, no school week, preview banner visible
  // const now = new Date("2026-11-02"); // switchover day — Winter 2026 becomes active (Week 1)
  // const now = new Date("2027-01-04"); // after Christmas — Winter 2026 active (Week 1)
  // const now = new Date("2027-02-08"); // mid-winter — Winter 2026 active (Week 3)
  // const now = new Date("2027-04-12"); // after Easter — Winter 2026 still current, but no matching school week

  appDate = now;

  document.getElementById("current-date-display").innerText = now.toLocaleDateString("en-GB", {
    dateStyle: "full",
  });

  try {
    resolveMenuKeys(await fetchJSON("menus/index.json"));
  } catch (e) {
    console.error("Could not load menu index:", e);
    document.getElementById("menu-container").innerHTML = message(
      "Couldn't Load Menus",
      "There was a problem loading the menu index. Try refreshing.",
    );
    return;
  }

  // Only the current and next menus are ever shown, so only fetch those.
  const keys = [currentMenuKey, nextMenuKey].filter(Boolean);
  await Promise.all(
    keys.map(async (filename) => {
      try {
        menus[filename] = await fetchJSON(`menus/${filename}`);
      } catch (e) {
        console.error(`Could not load menu ${filename}:`, e);
      }
    }),
  );

  activeMenuKey = currentMenuKey;
  resolveActiveWeek();
  render();

  // The containers are static, so one listener each covers every re-render
  document.getElementById("preview-banner").addEventListener("click", (e) => {
    if (e.target.closest("button")) togglePreview();
  });
  document.getElementById("week-selector").addEventListener("click", (e) => {
    const button = e.target.closest("button[data-week]");
    if (button) showWeek(Number(button.dataset.week));
  });
}

init();
