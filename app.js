const weekdayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"];

let menuIndex = [];
let menus = {};
let currentMenuKey = null;
let nextMenuKey = null;
let activeMenuKey = null;
let activeWeekNumber = null;
let currentWeekNumber = null;
let isPreview = false;

function getMonday(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function getTodayName() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
}

function getMenuStartDate(filename) {
  return filename.replace(".json", "");
}

function resolveMenuKeys(now) {
  const today = now.toISOString().split("T")[0];
  const sorted = [...menuIndex].sort((a, b) => getMenuStartDate(a).localeCompare(getMenuStartDate(b)));

  currentMenuKey = null;
  nextMenuKey = null;

  for (let i = 0; i < sorted.length; i++) {
    const startDate = getMenuStartDate(sorted[i]);
    if (startDate <= today) {
      currentMenuKey = sorted[i];
    }
  }

  if (currentMenuKey) {
    const currentIdx = sorted.indexOf(currentMenuKey);
    if (currentIdx < sorted.length - 1) {
      nextMenuKey = sorted[currentIdx + 1];
    }
  } else if (sorted.length > 0) {
    nextMenuKey = sorted[0];
  }
}

function getActiveMenu() {
  return menus[activeMenuKey] || null;
}

function getMenuData() {
  const menu = getActiveMenu();
  return menu ? menu.weeks : [];
}

function getWeekByNumber(num) {
  return getMenuData().find((w) => w.week === num) || null;
}

function renderMealContent(meal, baseJacketToppings) {
  if (!meal) {
    return `<p class="mdst-p mdst-p--sm mdst-p--muted">Menu not available.</p>`;
  }

  let html = `
    <div class="meal-row">
      <span class="meal-dot meal-dot--red"></span>
      <span class="meal-label">Main 1</span>
      <span class="meal-value">${meal.main}</span>
    </div>
    <div class="meal-row">
      <span class="meal-dot meal-dot--green"></span>
      <span class="meal-label">Main 2</span>
      <span class="meal-value">${meal.veggie}</span>
    </div>
    <div class="meal-row">
      <span class="meal-dot meal-dot--muted"></span>
      <span class="meal-label">Sides</span>
      <span class="meal-value">${meal.sides}</span>
    </div>
    <div class="meal-row">
      <span class="meal-dot meal-dot--muted"></span>
      <span class="meal-label">Dessert</span>
      <span class="meal-value"><mark class="mdst-mark">${meal.dessert}</mark></span>
    </div>`;

  const extras = meal.extraJacketToppings || [];
  const allToppings = [...(baseJacketToppings || []), ...extras];

  if (allToppings.length) {
    const baseHTML = (baseJacketToppings || [])
      .map((t) => `<span class="mdst-tag mdst-tag--sm mdst-tag--pill jacket-tag">${t}</span>`)
      .join("");
    const extrasHTML = extras
      .map((t) => `<span class="mdst-tag mdst-tag--sm mdst-tag--pill mdst-tag--solid jacket-tag--extra">${t}</span>`)
      .join("");

    html += `
      <div class="jacket-section">
        <div class="jacket-header">
          <span class="meal-dot meal-dot--yellow"></span>
          <span class="meal-label meal-label--auto">Jacket Potato</span>
        </div>
        <div class="jacket-toppings">
          ${baseHTML}${extrasHTML}
        </div>
      </div>`;
  }

  return html;
}

function renderDayCard(dayName, meal, state, baseJacketToppings) {
  const displayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const stateClass = state === "past" ? "day-card--past" : state === "today" ? "day-card--today" : "";

  let stateTag = "";
  if (state === "past") {
    stateTag = '<span class="mdst-tag mdst-tag--muted mdst-tag--sm mdst-tag--pill">Done</span>';
  } else if (state === "today") {
    stateTag = '<span class="mdst-tag mdst-tag--solid mdst-tag--sm mdst-tag--pill mdst-tag--success">Today</span>';
  }

  return `
    <div id="card-row-${dayName}" class="day-card ${stateClass}">
      <div class="day-card-header">
        <h4 class="mdst-h4">${displayName}</h4>
        ${stateTag}
      </div>
      <hr class="mdst-hr mdst-hr--flush day-card-divider" />
      ${renderMealContent(meal, baseJacketToppings)}
    </div>`;
}

function renderPreviewBanner() {
  const banner = document.getElementById("preview-banner");
  if (!banner) return;

  if (nextMenuKey && !isPreview) {
    const nextMenu = menus[nextMenuKey];
    const label = nextMenu?.label || getMenuStartDate(nextMenuKey);
    banner.innerHTML = `
      <div class="preview-banner">
        <span class="mdst-p mdst-p--sm">📋 Next menu available: <strong>${label}</strong></span>
        <button class="mdst-button mdst-button--sm preview-banner-button" onclick="togglePreview()">Preview</button>
      </div>`;
    banner.style.display = "";
  } else if (isPreview) {
    const currentMenu = menus[currentMenuKey];
    const label = currentMenu?.label || (currentMenuKey ? getMenuStartDate(currentMenuKey) : "current");
    banner.innerHTML = `
      <div class="preview-banner preview-banner--active">
        <span class="mdst-p mdst-p--sm">👀 Previewing upcoming menu</span>
        <button class="mdst-button mdst-button--sm preview-banner-button" onclick="togglePreview()">Back to ${label}</button>
      </div>`;
    banner.style.display = "";
  } else {
    banner.innerHTML = "";
    banner.style.display = "none";
  }
}

function togglePreview() {
  if (isPreview) {
    isPreview = false;
    activeMenuKey = currentMenuKey;
  } else if (nextMenuKey) {
    isPreview = true;
    activeMenuKey = nextMenuKey;
  }

  currentWeekNumber = null;
  activeWeekNumber = null;

  resolveActiveWeek();
  renderPreviewBanner();
  renderWeekSelector();
  renderMenu();
  updateWeekLabel();
}

function resolveActiveWeek() {
  const menuData = getMenuData();
  if (!menuData.length) return;

  if (!isPreview) {
    const now = new Date();
    const monday = getMonday(now);
    const currentWeek = menuData.find((w) => w.weekStart.includes(monday));
    currentWeekNumber = currentWeek ? currentWeek.week : null;
    activeWeekNumber = currentWeekNumber || menuData[0].week;
  } else {
    currentWeekNumber = null;
    activeWeekNumber = menuData[0].week;
  }
}

function updateWeekLabel() {
  const weekLabel = document.getElementById("week-label");
  if (isPreview) {
    const nextMenu = menus[nextMenuKey];
    const label = nextMenu?.label || getMenuStartDate(nextMenuKey);
    weekLabel.innerHTML = `<span class="mdst-tag mdst-tag--sm mdst-tag--pill mdst-tag--warning">Preview: ${label}</span>`;
  } else if (currentWeekNumber) {
    weekLabel.innerHTML = `<span class="mdst-tag mdst-tag--subtle mdst-tag--sm mdst-tag--pill">Week ${currentWeekNumber}</span>`;
  } else {
    weekLabel.innerHTML = `<span class="mdst-tag mdst-tag--muted mdst-tag--sm mdst-tag--pill">No active school week</span>`;
  }
}

function renderWeekSelector() {
  const menuData = getMenuData();
  const selector = document.getElementById("week-selector");

  if (!menuData.length) {
    selector.style.display = "none";
    return;
  }

  selector.style.display = "";
  selector.innerHTML = menuData
    .map((w) => {
      const isActive = w.week === activeWeekNumber;
      const isCurrent = w.week === currentWeekNumber && !isPreview;
      const variant = isActive ? "week-button--active" : "";
      const currentLabel = isCurrent
        ? ' <span class="mdst-tag mdst-tag--success mdst-tag--sm mdst-tag--pill week-selector-current">Current</span>'
        : "";
      return `<button class="mdst-button mdst-button--sm ${variant}" onclick="showWeek(${w.week})">Week ${w.week}${currentLabel}</button>`;
    })
    .join("");
}

function showWeek(weekNumber) {
  activeWeekNumber = weekNumber;
  renderWeekSelector();
  renderMenu();
}

function renderMenu() {
  const menuData = getMenuData();
  const menu = getActiveMenu();
  const todayName = getTodayName();
  const todayIndex = weekdayNames.indexOf(todayName);
  const isWeekday = weekdayNames.includes(todayName);
  const isCurrentWeek = activeWeekNumber === currentWeekNumber && !isPreview;
  const weekData = getWeekByNumber(activeWeekNumber);
  const container = document.getElementById("menu-container");

  if (!weekData) {
    container.innerHTML = `
      <div class="message-block">
        <h3 class="mdst-h3">Menu Not Found</h3>
        <p class="mdst-p mdst-p--muted">This week's menu isn't available.</p>
      </div>`;
    return;
  }

  const baseJacketToppings = menu?.genericJacketToppings || [];
  let html = "";

  if (isCurrentWeek && !isWeekday) {
    html += `
      <div class="message-block message-block--weekend">
        <h3 class="mdst-h3">It's the weekend! 🎉</h3>
        <p class="mdst-p mdst-p--muted">No school lunch today. Here's the menu for this week.</p>
      </div>`;
  }

  html += '<div class="week-row">';

  for (let i = 0; i < weekdayNames.length; i++) {
    const day = weekdayNames[i];
    const meal = weekData.days[day] || null;

    let state = "upcoming";
    if (isCurrentWeek && isWeekday) {
      if (i < todayIndex) {
        state = "past";
      } else if (i === todayIndex) {
        state = "today";
      }
    }

    html += renderDayCard(day, meal, state, baseJacketToppings);
  }

  html += "</div>";
  container.innerHTML = html;
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function init() {
  const now = new Date();
  // const now = new Date("2026-04-05");

  document.getElementById("current-date-display").innerText = now.toLocaleDateString("en-GB", {
    dateStyle: "full",
  });

  try {
    menuIndex = await fetchJSON("menus/index.json");
  } catch (e) {
    console.error("Could not load menu index:", e);
    document.getElementById("menu-container").innerHTML = `
      <div class="message-block">
        <h3 class="mdst-h3">Couldn't Load Menus</h3>
        <p class="mdst-p mdst-p--muted">There was a problem loading the menu index. Try refreshing.</p>
      </div>`;
    return;
  }

  const fetchPromises = menuIndex.map(async (filename) => {
    try {
      menus[filename] = await fetchJSON(`menus/${filename}`);
    } catch (e) {
      console.error(`Could not load menu ${filename}:`, e);
    }
  });
  await Promise.all(fetchPromises);

  resolveMenuKeys(now);

  if (!currentMenuKey || !menus[currentMenuKey]) {
    activeMenuKey = null;

    document.getElementById("week-label").innerHTML =
      `<span class="mdst-tag mdst-tag--muted mdst-tag--sm mdst-tag--pill">No active school week</span>`;
    document.getElementById("week-selector").style.display = "none";

    if (nextMenuKey && menus[nextMenuKey]) {
      const nextMenu = menus[nextMenuKey];
      const label = nextMenu.label || getMenuStartDate(nextMenuKey);
      document.getElementById("menu-container").innerHTML = `
        <div class="message-block">
          <h3 class="mdst-h3">Whoopsie! Latest menu needs updating.</h3>
          <p class="mdst-p mdst-p--muted">The current week doesn't match any menu on file.<br />Check back soon, it'll be updated shortly (maybe)!</p>
          <p class="mdst-p mdst-p--sm" style="margin-top: var(--mdst-space-md);">
            <button class="mdst-button mdst-button--sm" onclick="togglePreview()">Preview upcoming menu: ${label}</button>
          </p>
        </div>`;
      renderPreviewBanner();
    } else {
      document.getElementById("menu-container").innerHTML = `
        <div class="message-block">
          <h3 class="mdst-h3">Whoopsie! Latest menu needs updating.</h3>
          <p class="mdst-p mdst-p--muted">The current week doesn't match any menu on file.<br />Check back soon, it'll be updated shortly (maybe)!</p>
        </div>`;
    }
    return;
  }

  activeMenuKey = currentMenuKey;
  resolveActiveWeek();

  updateWeekLabel();
  renderPreviewBanner();
  renderWeekSelector();
  renderMenu();
}

init();
