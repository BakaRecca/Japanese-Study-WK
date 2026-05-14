const DEFAULT_LEVEL = 41;
const MIN_LEVEL = 1;
const MAX_LEVEL = 60;

const LEVEL_SEGMENTS = [
  { label: "快", romaji: "Pleasant", start: 1, end: 10 },
  { label: "苦", romaji: "Painful", start: 11, end: 20 },
  { label: "死", romaji: "Death", start: 21, end: 30 },
  { label: "地獄", romaji: "Hell", start: 31, end: 40 },
  { label: "天国", romaji: "Paradise", start: 41, end: 50 },
  { label: "現実", romaji: "Reality", start: 51, end: 60 }
];

let subjects = [];
let currentLang = "en";
let currentSubjectId = null;
let touchStartX = 0;
let lightboxImages = [];
let lightboxImageIndex = 0;
let showOnyomiAsKatakana = true;
let showExtraReadings = true;
let showLightboxStudyText = true;
let showLightboxStudyHeader = true;
let loopLightboxAcrossKanji = false;
let loopLightboxAcrossLevels = false;

const SETTINGS_KEYS = {
  level: "wk-study-current-level",
  onyomiAsKatakana: "wk-study-onyomi-as-katakana",
  showExtraReadings: "wk-study-show-extra-readings",
  lightboxStudyText: "wk-study-lightbox-study-text",
  lightboxStudyHeader: "wk-study-lightbox-study-header",
  loopLightboxAcrossKanji: "wk-study-loop-lightbox-across-kanji",
  loopLightboxAcrossLevels: "wk-study-loop-lightbox-across-levels",
  kanjiCardColumns: "wk-study-kanji-card-columns",
  kanjiCardRows: "wk-study-kanji-card-rows",
  lastSubjectId: "wk-study-last-subject-id",
  lastView: "wk-study-last-view"
};

async function loadData() {
  document.querySelector("header h1").textContent = "Study J-WK";

  const response = await fetch("data/wanikani-subjects.json");
  const json = await response.json();
  subjects = json.subjects ?? json;
  loadSettings();
  applySavedLayoutSettings();
  setupMobileMenu();
  setupHeaderNavigation();
  setupLevelSelect();
  setupHeaderSearch();
  setupSettingsMenu();
  render();
  restoreLastSession();
  updateHeaderLayoutMode();
}

function setupHeaderNavigation() {
  const header = document.querySelector("header");
  const langToggle = document.getElementById("langToggle");

  if (!header || document.getElementById("headerNav")) return;

  const nav = document.createElement("nav");
  nav.id = "headerNav";
  nav.className = "header-nav";
  nav.innerHTML = `
    <button type="button" class="header-nav-button" title="Radicals">Radicals</button>
    <button type="button" class="header-nav-button is-active" title="Kanji">Kanji</button>
    <button type="button" class="header-nav-button" title="Vocabulary">Vocabulary</button>
  `;

  if (langToggle) {
    header.insertBefore(nav, langToggle);
  } else {
    header.appendChild(nav);
  }
}

function setupMobileMenu() {
  const header = document.querySelector("header");

  if (!header || document.getElementById("mobileMenuButton")) return;

  const menuButton = document.createElement("button");
  const overlay = document.createElement("div");

  menuButton.id = "mobileMenuButton";
  menuButton.className = "mobile-menu-button";
  menuButton.type = "button";
  menuButton.textContent = "MENU";
  menuButton.setAttribute("aria-label", "Open menu");
  menuButton.setAttribute("aria-expanded", "false");

  overlay.id = "mobileMenuOverlay";
  overlay.className = "mobile-menu-overlay hidden";
  overlay.innerHTML = `
    <aside class="mobile-menu-panel" aria-label="Menu">
      <div class="mobile-menu-header">
        <strong>Menu</strong>
        <button type="button" class="mobile-menu-close" aria-label="Close menu">×</button>
      </div>

      <div id="mobileMenuContent" class="mobile-menu-content"></div>
    </aside>
  `;

  header.insertBefore(menuButton, header.firstChild);
  document.body.appendChild(overlay);

  menuButton.addEventListener("click", () => openMobileMenu());

  overlay.addEventListener("click", event => {
    if (
      event.target.id === "mobileMenuOverlay" ||
      event.target.classList.contains("mobile-menu-close")
    ) {
      closeMobileMenu();
    }
  });
}

function openMobileMenu() {
  const overlay = document.getElementById("mobileMenuOverlay");
  const button = document.getElementById("mobileMenuButton");

  if (!overlay || !button) return;

  renderMobileMenu();
  overlay.classList.remove("hidden");
  document.body.classList.add("mobile-menu-open");
  button.setAttribute("aria-expanded", "true");
}

function closeMobileMenu() {
  const overlay = document.getElementById("mobileMenuOverlay");
  const button = document.getElementById("mobileMenuButton");

  if (!overlay || !button || overlay.classList.contains("hidden")) return;

  overlay.classList.add("is-closing");
  button.setAttribute("aria-expanded", "false");

  window.setTimeout(() => {
    overlay.classList.add("hidden");
    overlay.classList.remove("is-closing");
    document.body.classList.remove("mobile-menu-open");
  }, 180);
}

function renderMobileMenu() {
  const content = document.getElementById("mobileMenuContent");
  const searchInput = document.getElementById("search");

  if (!content || !searchInput) return;

  const currentLevel = getCurrentLevel();
  const currentSearch = searchInput.value;

  content.innerHTML = `
    <section class="mobile-menu-section">
      <button type="button" class="mobile-menu-foldout-button" onclick="toggleMobileMenuSection('mobileLevelSection')">
        <span>レベル <span>Level</span></span>
        <span>▾</span>
      </button>

      <div id="mobileLevelSection" class="mobile-menu-foldout-content hidden">
        ${LEVEL_SEGMENTS.map(segment => `
          <div class="mobile-menu-level-segment">
            <h4>${escapeHtml(segment.label)} <span>${escapeHtml(segment.romaji)}</span></h4>
            <div class="mobile-menu-level-grid">
              ${Array.from(
                { length: segment.end - segment.start + 1 },
                (_, index) => segment.start + index
              ).map(level => `
                <button
                  type="button"
                  class="mobile-menu-level-button ${level === currentLevel ? "is-active" : ""}"
                  onclick="selectLevelFromMobileMenu(${level})"
                >
                  ${String(level).padStart(2, "0")}
                </button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="mobile-menu-section">
      <h3>Study Type</h3>
      <button type="button" class="mobile-menu-nav-button">Radicals</button>
      <button type="button" class="mobile-menu-nav-button is-active">Kanji</button>
      <button type="button" class="mobile-menu-nav-button">Vocabulary</button>
    </section>
  `;

  // Removed mobileMenuSearchInput and mobileMenuOnyomiKatakanaToggle event listeners.
}

function toggleMobileMenuSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  if (section.classList.contains("hidden")) {
    section.classList.remove("hidden", "is-closing");
    return;
  }

  section.classList.add("is-closing");

  window.setTimeout(() => {
    section.classList.add("hidden");
    section.classList.remove("is-closing");
  }, 140);
}

function selectLevelFromMobileMenu(level) {
  setCurrentLevel(level);
  closeMobileMenu();
}

function updateHeaderLayoutMode() {
  const header = document.querySelector("header");

  if (!header) return;

  document.body.classList.remove("use-mobile-menu");

  const shouldUseMobileMenu =
    window.matchMedia("(max-width: 700px), (orientation: portrait) and (max-width: 900px)").matches ||
    header.scrollWidth > header.clientWidth;

  document.body.classList.toggle("use-mobile-menu", shouldUseMobileMenu);
}

function loadSettings() {
  const savedKatakanaSetting = localStorage.getItem(SETTINGS_KEYS.onyomiAsKatakana);
  const savedExtraReadingsSetting = localStorage.getItem(SETTINGS_KEYS.showExtraReadings);
  const savedLightboxStudyTextSetting = localStorage.getItem(SETTINGS_KEYS.lightboxStudyText);
  const savedLightboxStudyHeaderSetting = localStorage.getItem(SETTINGS_KEYS.lightboxStudyHeader);
  const savedLoopLightboxAcrossKanjiSetting = localStorage.getItem(SETTINGS_KEYS.loopLightboxAcrossKanji);
  const savedLoopLightboxAcrossLevelsSetting = localStorage.getItem(SETTINGS_KEYS.loopLightboxAcrossLevels);

  if (savedKatakanaSetting !== null) {
    showOnyomiAsKatakana = savedKatakanaSetting === "true";
  }

  if (savedExtraReadingsSetting !== null) {
    showExtraReadings = savedExtraReadingsSetting === "true";
  }

  if (savedLightboxStudyTextSetting !== null) {
    showLightboxStudyText = savedLightboxStudyTextSetting === "true";
  }

  if (savedLightboxStudyHeaderSetting !== null) {
    showLightboxStudyHeader = savedLightboxStudyHeaderSetting === "true";
  }

  if (savedLoopLightboxAcrossKanjiSetting !== null) {
    loopLightboxAcrossKanji = savedLoopLightboxAcrossKanjiSetting === "true";
  }

  if (savedLoopLightboxAcrossLevelsSetting !== null) {
    loopLightboxAcrossLevels = savedLoopLightboxAcrossLevelsSetting === "true";
  }
}

function getSavedKanjiCardColumns() {
  const savedColumns = Number(localStorage.getItem(SETTINGS_KEYS.kanjiCardColumns));

  if (Number.isFinite(savedColumns) && savedColumns >= 1 && savedColumns <= 4) {
    return savedColumns;
  }

  return 4;
}

function getSavedKanjiCardRows() {
  const savedRows = Number(localStorage.getItem(SETTINGS_KEYS.kanjiCardRows));

  if (Number.isFinite(savedRows) && savedRows >= 1 && savedRows <= 5) {
    return savedRows;
  }

  return 4;
}

function setKanjiCardColumns(columns) {
  const nextColumns = Math.min(4, Math.max(1, Number(columns)));
  localStorage.setItem(SETTINGS_KEYS.kanjiCardColumns, String(nextColumns));
  document.documentElement.style.setProperty("--kanji-card-columns", String(nextColumns));
}

function setKanjiCardRows(rows) {
  const nextRows = Math.min(5, Math.max(1, Number(rows)));
  localStorage.setItem(SETTINGS_KEYS.kanjiCardRows, String(nextRows));
  document.documentElement.style.setProperty("--kanji-card-rows", String(nextRows));
}

function applySavedLayoutSettings() {
  setKanjiCardColumns(getSavedKanjiCardColumns());
  setKanjiCardRows(getSavedKanjiCardRows());
}

function getSavedLevel() {
  const savedLevel = Number(localStorage.getItem(SETTINGS_KEYS.level));

  if (Number.isFinite(savedLevel) && savedLevel >= MIN_LEVEL && savedLevel <= MAX_LEVEL) {
    return savedLevel;
  }

  return DEFAULT_LEVEL;
}

function saveSessionView(view, subjectId = null) {
  localStorage.setItem(SETTINGS_KEYS.lastView, view);

  if (subjectId) {
    localStorage.setItem(SETTINGS_KEYS.lastSubjectId, String(subjectId));
    return;
  }

  localStorage.removeItem(SETTINGS_KEYS.lastSubjectId);
}

function getSavedSubjectId() {
  const subjectId = Number(localStorage.getItem(SETTINGS_KEYS.lastSubjectId));

  if (Number.isFinite(subjectId) && subjectId > 0) {
    return subjectId;
  }

  return null;
}

function restoreLastSession() {
  const lastView = localStorage.getItem(SETTINGS_KEYS.lastView);
  const savedSubjectId = getSavedSubjectId();
  const savedSubject = savedSubjectId
    ? subjects.find(subject => subject.id === savedSubjectId)
    : null;

  if (lastView === "detail" && savedSubject) {
    showDetail(savedSubject.id, { restoreSession: true });
    return;
  }

  showList();
  render();
}

function resetSavedSession() {
  localStorage.removeItem(SETTINGS_KEYS.lastView);
  localStorage.removeItem(SETTINGS_KEYS.lastSubjectId);
  currentSubjectId = null;
  showList();
  render();
}

function setupSettingsMenu() {
  const header = document.querySelector("header");

  if (!header || document.getElementById("settingsMenu")) return;

  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  const panel = document.createElement("div");

  wrapper.id = "settingsMenu";
  wrapper.className = "settings-menu";

  button.id = "settingsButton";
  button.className = "settings-button";
  button.type = "button";
  button.title = "Settings";
  button.setAttribute("aria-label", "Settings");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "⚙";

  panel.id = "settingsPanel";
  panel.className = "settings-panel hidden";
  panel.innerHTML = `
    <label class="settings-row">
      <input id="onyomiKatakanaToggle" type="checkbox" ${showOnyomiAsKatakana ? "checked" : ""} />
      <span>Show On’yomi as Katakana</span>
    </label>

    <label class="settings-row">
      <input id="extraReadingsToggle" type="checkbox" ${showExtraReadings ? "checked" : ""} />
      <span>Show extra readings</span>
    </label>

    <label class="settings-row">
      <input id="lightboxStudyHeaderToggle" type="checkbox" ${showLightboxStudyHeader ? "checked" : ""} />
      <span>Show image viewer study header</span>
    </label>

    <label class="settings-row">
      <input id="lightboxStudyTextToggle" type="checkbox" ${showLightboxStudyText ? "checked" : ""} />
      <span>Show mnemonic text in image viewer</span>
    </label>

    <label class="settings-row">
      <input id="loopLightboxAcrossKanjiToggle" type="checkbox" ${loopLightboxAcrossKanji ? "checked" : ""} />
      <span>Swipe image viewer across kanji</span>
    </label>

    <label class="settings-row">
      <input id="loopLightboxAcrossLevelsToggle" type="checkbox" ${loopLightboxAcrossLevels ? "checked" : ""} />
      <span>Swipe image viewer across levels</span>
    </label>

    <button id="settingsLanguageButton" type="button" class="settings-action-button">
      Language: ${currentLang.toUpperCase()}
    </button>

    <label class="settings-field">
      <span>Kanji cards per row</span>
      <select id="kanjiCardColumnsSelect">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
      </select>
    </label>

    <label class="settings-field">
      <span>Kanji card rows on screen</span>
      <select id="kanjiCardRowsSelect">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </label>

    <button id="settingsStartMainButton" type="button" class="settings-action-button">
      Start from main list
    </button>
  `;

  wrapper.appendChild(button);
  wrapper.appendChild(panel);
  header.appendChild(wrapper);

  button.addEventListener("click", event => {
    event.stopPropagation();
    const isOpen = !panel.classList.contains("hidden");
    panel.classList.toggle("hidden", isOpen);
    button.setAttribute("aria-expanded", String(!isOpen));
  });

  panel.querySelector("#onyomiKatakanaToggle").addEventListener("change", event => {
    showOnyomiAsKatakana = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.onyomiAsKatakana, String(showOnyomiAsKatakana));

    if (currentSubjectId) {
      showDetail(currentSubjectId);
      return;
    }

    render();
  });

  panel.querySelector("#extraReadingsToggle").addEventListener("change", event => {
    showExtraReadings = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.showExtraReadings, String(showExtraReadings));
    renderHeaderSearchResults();

    if (currentSubjectId) {
      showDetail(currentSubjectId);
      return;
    }

    render();
  });

  panel.querySelector("#lightboxStudyTextToggle").addEventListener("change", event => {
    showLightboxStudyText = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.lightboxStudyText, String(showLightboxStudyText));
  });

  panel.querySelector("#lightboxStudyHeaderToggle").addEventListener("change", event => {
    showLightboxStudyHeader = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.lightboxStudyHeader, String(showLightboxStudyHeader));
  });

  panel.querySelector("#loopLightboxAcrossKanjiToggle").addEventListener("change", event => {
    loopLightboxAcrossKanji = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.loopLightboxAcrossKanji, String(loopLightboxAcrossKanji));
  });

  panel.querySelector("#loopLightboxAcrossLevelsToggle").addEventListener("change", event => {
    loopLightboxAcrossLevels = event.target.checked;
    localStorage.setItem(SETTINGS_KEYS.loopLightboxAcrossLevels, String(loopLightboxAcrossLevels));
  });

  panel.querySelector("#settingsLanguageButton").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "sv" : "en";
    panel.querySelector("#settingsLanguageButton").textContent = `Language: ${currentLang.toUpperCase()}`;

    if (currentSubjectId) {
      showDetail(currentSubjectId);
      return;
    }

    render();
  });

  panel.querySelector("#settingsStartMainButton").addEventListener("click", () => {
    resetSavedSession();
    panel.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
  });

  const kanjiCardColumnsSelect = panel.querySelector("#kanjiCardColumnsSelect");
  kanjiCardColumnsSelect.value = String(getSavedKanjiCardColumns());
  kanjiCardColumnsSelect.addEventListener("change", event => {
    setKanjiCardColumns(event.target.value);
  });

  const kanjiCardRowsSelect = panel.querySelector("#kanjiCardRowsSelect");
  kanjiCardRowsSelect.value = String(getSavedKanjiCardRows());
  kanjiCardRowsSelect.addEventListener("change", event => {
    setKanjiCardRows(event.target.value);
  });

  document.addEventListener("click", event => {
    if (wrapper.contains(event.target)) return;
    panel.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
  });
}

function setupLevelSelect() {
  const levelSelect = document.getElementById("levelSelect");

  levelSelect.innerHTML = "";

  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
    const option = document.createElement("option");
    option.value = String(level);
    option.textContent = `Level ${level}`;
    levelSelect.appendChild(option);
  }

  const header = document.querySelector("header");
  const headerNav = document.getElementById("headerNav");
  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  const panel = document.createElement("div");

  wrapper.className = "level-picker header-level-picker";
  button.id = "levelPickerButton";
  button.className = "level-picker-button";
  button.type = "button";
  button.title = "レベル (Level)";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");

  panel.id = "levelPickerPanel";
  panel.className = "level-picker-panel hidden";

  levelSelect.classList.add("hidden");
  levelSelect.value = String(getSavedLevel());

  if (header && headerNav) {
    header.insertBefore(wrapper, headerNav);
  } else if (header) {
    header.appendChild(wrapper);
  } else {
    levelSelect.insertAdjacentElement("afterend", wrapper);
  }

  wrapper.appendChild(button);
  wrapper.appendChild(panel);

  renderLevelPicker();

  button.addEventListener("click", () => {
    const isOpen = !panel.classList.contains("hidden");
    panel.classList.toggle("hidden", isOpen);
    button.setAttribute("aria-expanded", String(!isOpen));
  });

  document.addEventListener("click", event => {
    if (wrapper.contains(event.target)) return;
    panel.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
  });
}

function setupHeaderSearch() {
  const searchInput = document.getElementById("search");
  const header = document.querySelector("header");
  const langToggle = document.getElementById("langToggle");

  if (!searchInput || !header || document.getElementById("headerSearch")) return;

  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  const results = document.createElement("div");

  wrapper.id = "headerSearch";
  wrapper.className = "header-search";

  button.id = "headerSearchButton";
  button.className = "header-search-button";
  button.type = "button";
  button.title = "Search";
  button.setAttribute("aria-label", "Search");
  button.setAttribute("aria-expanded", "false");
  button.textContent = "⌕";

  searchInput.classList.add("header-search-input", "hidden");
  searchInput.placeholder = "Search kanji, meanings, readings...";

  results.id = "headerSearchResults";
  results.className = "header-search-results hidden";

  wrapper.appendChild(button);
  wrapper.appendChild(searchInput);
  wrapper.appendChild(results);

  if (langToggle) {
    header.insertBefore(wrapper, langToggle);
  } else {
    header.appendChild(wrapper);
  }

  button.addEventListener("click", event => {
    event.stopPropagation();
    const isOpen = !searchInput.classList.contains("hidden");
    searchInput.classList.toggle("hidden", isOpen);
    results.classList.toggle("hidden", isOpen || !searchInput.value.trim());
    button.setAttribute("aria-expanded", String(!isOpen));

    if (!isOpen) {
      searchInput.focus();
      searchInput.select();
      renderHeaderSearchResults();
    }
  });

  searchInput.addEventListener("input", () => {
    renderHeaderSearchResults();

    if (!currentSubjectId) {
      render();
    }
  });

  document.addEventListener("click", event => {
    if (wrapper.contains(event.target)) return;
    searchInput.classList.add("hidden");
    results.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
  });
}

function renderHeaderSearchResults() {
  const searchInput = document.getElementById("search");
  const results = document.getElementById("headerSearchResults");

  if (!searchInput || !results) return;

  const search = searchInput.value.trim();

  if (!search) {
    results.classList.add("hidden");
    results.innerHTML = "";
    return;
  }

  const matches = getCurrentKanjiList().slice(0, 12);

  results.classList.remove("hidden");
  results.innerHTML = matches.length
    ? matches.map(subject => `
      <button type="button" class="header-search-result" onclick="selectSearchResult(${subject.id})">
        <span class="header-search-result-kanji">${escapeHtml(subject.data.characters)}</span>
        <span class="header-search-result-main">
          <span class="header-search-result-level">Level ${subject.data.level}</span>
          <span class="header-search-result-readings">
            ${(() => {
              const readings = subject.data.readings ?? [];
              const primaryReadings = sortReadingsForCard(readings.filter(reading => reading.primary));
              const secondaryReadings = showExtraReadings
                ? sortReadingsForCard(readings.filter(reading => !reading.primary))
                : [];

              return `
                ${renderCardReadingGroup(primaryReadings, "kanji-card-primary-reading")}
                <strong>${escapeHtml(getMeaning(subject))}</strong>
                ${renderCardReadingGroup(secondaryReadings, "kanji-card-secondary-readings")}
              `;
            })()}
          </span>
        </span>
      </button>
    `).join("")
    : `<div class="header-search-empty">No kanji found</div>`;
}

function selectSearchResult(subjectId) {
  const searchInput = document.getElementById("search");
  const results = document.getElementById("headerSearchResults");
  const button = document.getElementById("headerSearchButton");

  searchInput?.classList.add("hidden");
  results?.classList.add("hidden");
  button?.setAttribute("aria-expanded", "false");

  showDetail(subjectId);
}

function getCurrentLevel() {
  const level = Number(document.getElementById("levelSelect").value);
  return Number.isFinite(level) && level >= MIN_LEVEL ? level : DEFAULT_LEVEL;
}

function setCurrentLevel(level) {
  const levelSelect = document.getElementById("levelSelect");
  levelSelect.value = String(level);
  localStorage.setItem(SETTINGS_KEYS.level, String(level));
  currentSubjectId = null;
  renderLevelPicker();
  showList();
  render();
}

function renderLevelPicker() {
  const levelSelect = document.getElementById("levelSelect");
  const button = document.getElementById("levelPickerButton");
  const panel = document.getElementById("levelPickerPanel");

  if (!button || !panel) return;

  const currentLevel = getCurrentLevel();
  button.textContent = `レベル ${currentLevel}`;

  panel.innerHTML = LEVEL_SEGMENTS.map(segment => `
    <section class="level-segment">
      <h3 class="level-segment-title">
        <span>${escapeHtml(segment.label)}</span>
        <span>${escapeHtml(segment.romaji)}</span>
      </h3>

      <div class="level-grid">
        ${Array.from(
          { length: segment.end - segment.start + 1 },
          (_, index) => segment.start + index
        ).map(level => `
          <button
            type="button"
            class="level-grid-button ${level === currentLevel ? "is-active" : ""}"
            onclick="selectLevel(${level})"
          >
            ${String(level).padStart(2, "0")}
          </button>
        `).join("")}
      </div>
    </section>
  `).join("");
}

function selectLevel(level) {
  const panel = document.getElementById("levelPickerPanel");
  const button = document.getElementById("levelPickerButton");

  setCurrentLevel(level);
  panel?.classList.add("hidden");
  button?.setAttribute("aria-expanded", "false");
}

function getMeaning(subject) {
  const primary = subject.data.meanings?.find(m => m.primary);
  return primary?.meaning ?? "Unknown";
}

function hiraganaToKatakana(text) {
  return String(text ?? "").replace(/[ぁ-ゖ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) + 0x60)
  );
}

function katakanaToHiragana(text) {
  return String(text ?? "").replace(/[ァ-ヶ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}

function normalizeReadingSearchText(text) {
  return katakanaToHiragana(String(text ?? "").toLowerCase().trim());
}

function formatReadingForDisplay(reading, type) {
  if (type === "onyomi" && showOnyomiAsKatakana) {
    return hiraganaToKatakana(reading);
  }

  return reading;
}

function getReadings(subject) {
  return subject.data.readings
    ?.map(reading => formatReadingForDisplay(reading.reading, reading.type))
    .join(", ") ?? "";
}

function getMeanings(subject) {
  return subject.data.meanings ?? [];
}

function getPrimaryMeanings(subject) {
  return getMeanings(subject)
    .filter(meaning => meaning.primary)
    .map(meaning => meaning.meaning);
}

function getAlternativeMeanings(subject) {
  return getMeanings(subject)
    .filter(meaning => !meaning.primary)
    .map(meaning => meaning.meaning);
}

function getReadingsByType(subject, type) {
  return subject.data.readings
    ?.filter(reading => reading.type === type)
    .map(reading => ({
      reading: reading.reading,
      primary: reading.primary
    })) ?? [];
}

function renderReadingList(readings, type) {
  if (readings.length === 0) return "None";

  return readings.map(reading => {
    const className = reading.primary ? "primary-reading" : "";
    const displayReading = formatReadingForDisplay(reading.reading, type);
    return `<span class="${className}">${escapeHtml(displayReading)}</span>`;
  }).join(", ");
}

function sortReadingsForCard(readings) {
  const typeOrder = {
    onyomi: 0,
    kunyomi: 1,
    nanori: 2
  };

  return [...readings].sort((a, b) => {
    const typeDifference = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
    if (typeDifference !== 0) return typeDifference;
    return a.reading.localeCompare(b.reading, "ja");
  });
}

function renderCardReadingGroup(readings, className) {
  if (readings.length === 0) return "";

  const items = readings.map((reading, index) => {
    const displayReading = formatReadingForDisplay(reading.reading, reading.type);
    const separator = index < readings.length - 1 ? ",&nbsp;" : "";
    return `<span class="kanji-card-reading-item">${escapeHtml(displayReading)}${separator}</span>`;
  }).join("");

  return `<div class="${className}">${items}</div>`;
}

function renderCardReadings(subject) {
  const readings = subject.data.readings ?? [];
  const primaryReadings = sortReadingsForCard(readings.filter(reading => reading.primary));
  const secondaryReadings = showExtraReadings
    ? sortReadingsForCard(readings.filter(reading => !reading.primary))
    : [];

  return `
    ${renderCardReadingGroup(primaryReadings, "kanji-card-primary-reading")}
    ${renderCardReadingGroup(secondaryReadings, "kanji-card-secondary-readings")}
  `;
}

function getSubjectColorClass(subject) {
  if (subject.object === "radical") return "detail-symbol-radical";
  if (subject.object === "kanji") return "detail-symbol-kanji";
  return "detail-symbol-vocabulary";
}

function getSubjectColorClassByType(type) {
  if (type === "radical") return "detail-symbol-radical";
  if (type === "kanji") return "detail-symbol-kanji";
  return "detail-symbol-vocabulary";
}

function getSearchText(subject) {
  return normalizeReadingSearchText([
    subject.data.characters,
    ...getMeanings(subject).map(meaning => meaning.meaning),
    ...(subject.data.readings ?? []).flatMap(reading => [
      reading.reading,
      hiraganaToKatakana(reading.reading)
    ])
  ].join(" "));
}

function getSearchRank(subject, search) {
  if (!search) return 0;

  const normalizedSearch = normalizeReadingSearchText(search);
  const readings = subject.data.readings ?? [];

  const primaryReadingMatch = readings.some(reading =>
    reading.primary && normalizeReadingSearchText(reading.reading).includes(normalizedSearch)
  );

  if (primaryReadingMatch) return 0;

  const anyReadingMatch = readings.some(reading =>
    normalizeReadingSearchText(reading.reading).includes(normalizedSearch)
  );

  if (anyReadingMatch) return 1;

  return 2;
}

function getCurrentKanjiList() {
  const rawSearch = document.getElementById("search").value.trim();
  const search = normalizeReadingSearchText(rawSearch);
  const level = getCurrentLevel();

  const kanji = subjects.filter(s =>
    s.object === "kanji" &&
    s.data.hidden_at === null
  );

  const filtered = search
    ? kanji.filter(s => getSearchText(s).includes(search))
    : kanji.filter(s => s.data.level === level);

  return filtered.sort((a, b) => {
    if (search) {
      const rankDifference = getSearchRank(a, search) - getSearchRank(b, search);
      if (rankDifference !== 0) return rankDifference;
    }

    if (a.data.level !== b.data.level) return a.data.level - b.data.level;
    return getMeaning(a).localeCompare(getMeaning(b));
  });
}

function getAdjacentKanji(subjectId) {
  const kanjiList = getCurrentKanjiList();
  const currentIndex = kanjiList.findIndex(s => s.id === subjectId);

  return {
    previous: currentIndex > 0 ? kanjiList[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < kanjiList.length - 1 ? kanjiList[currentIndex + 1] : null,
    currentIndex,
    total: kanjiList.length
  };
}

function navigateKanji(direction) {
  if (!currentSubjectId) return;

  const adjacent = getAdjacentKanji(currentSubjectId);
  const target = direction < 0 ? adjacent.previous : adjacent.next;
  const currentSectionId = getCurrentDetailSectionId();

  if (target) {
    showDetail(target.id, { scrollToSectionId: currentSectionId });
  }
}


function updateAppHeaderHeight() {
  const header = document.querySelector("header");
  if (!header) return;

  const height = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--app-header-height", `${height}px`);
}

function getStickyContentOffset() {
  const header = document.querySelector("header");
  const studyHeader = document.querySelector(".study-header");
  const rootStyles = getComputedStyle(document.documentElement);
  const stickyGap = Number.parseFloat(rootStyles.getPropertyValue("--sticky-gap")) || 0;

  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const studyHeaderHeight = studyHeader?.getBoundingClientRect().height ?? 0;

  return headerHeight + studyHeaderHeight + stickyGap + 16;
}

function getCurrentDetailSectionId() {
  const sectionIds = [
    "kanjiSection",
    "radicalsSection",
    "meaningSection",
    "readingSection",
    "similarKanjiSection",
    "foundVocabularySection"
  ];

  let currentSectionId = sectionIds[0];

  for (const sectionId of sectionIds) {
    const section = document.getElementById(sectionId);
    if (!section) continue;

    const sectionTop = section.getBoundingClientRect().top;
    const scrollMarginTop = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || getStickyContentOffset();
    const activationLine = scrollMarginTop + 8;

    if (sectionTop <= activationLine) {
      currentSectionId = sectionId;
    }
  }

  return currentSectionId;
}

function getRadicalComponents(subject) {
  const componentIds = subject.data.component_subject_ids ?? [];

  return componentIds
    .map(id => subjects.find(s => s.id === id))
    .filter(component => component && component.object === "radical");
}

function renderRadicalComponents(subject) {
  const radicals = getRadicalComponents(subject);

  if (radicals.length === 0) {
    return "";
  }

  return `
    <section id="radicalsSection" class="section-card">
      <h2 class="section-title">Radical Combination</h2>
      <div class="divider"></div>

      <div class="radical-components">
        ${radicals.map(radical => `
          <article class="radical-chip">
            <div class="radical-symbol">
              ${escapeHtml(radical.data.characters ?? "?")}
            </div>
            <div class="radical-name">
              ${escapeHtml(getMeaning(radical))}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getPrimaryReadings(subject) {
  return subject.data.readings
    ?.filter(reading => reading.primary) ?? [];
}

function renderStudyHeader(subject) {
  const radicals = getRadicalComponents(subject);
  const primaryReadings = sortReadingsForCard(getPrimaryReadings(subject));

  return `
    <div class="study-header ${radicals.length <= 3 ? "study-header-can-inline-radicals" : "study-header-stack-radicals"}">
      <button type="button" class="study-header-kanji ${getSubjectColorClass(subject)}" onclick="openSymbolLightbox('${escapeHtml(subject.data.characters)}', '${escapeHtml(getMeaning(subject))}', 'kanji')">
        ${escapeHtml(subject.data.characters)}
      </button>

      <div class="study-header-main">
        <div class="study-header-meaning">${escapeHtml(getMeaning(subject))}</div>
        <div class="study-header-reading">${primaryReadings.length ? primaryReadings.map(reading => escapeHtml(formatReadingForDisplay(reading.reading, reading.type))).join(",&nbsp;") : "No primary reading"}</div>
      </div>

      <div class="study-header-radicals" aria-label="Radicals">
        ${radicals.map(radical => `
          <div class="study-header-radical-chip" title="${escapeHtml(getMeaning(radical))}">
            <button type="button" class="study-header-radical-symbol" onclick="openSymbolLightbox('${escapeHtml(radical.data.characters ?? "?")}', '${escapeHtml(getMeaning(radical))}', 'radical')">
              ${escapeHtml(radical.data.characters ?? "?")}
            </button>
            <span class="study-header-radical-name">
              ${escapeHtml(getMeaning(radical))}
            </span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replaceAll("'", "")
    .replaceAll("’", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getImagePath(subject, type) {
  const level = subject.data.level;
  const meaningSlug = slugify(getMeaning(subject));
  return `assets/images/${currentLang}/kanji/${level}/${meaningSlug}-${type}.webp`;
}

function getSubjectImageGallery(subject) {
  return [
    {
      subjectId: subject.id,
      type: "meaning",
      label: "Meaning mnemonic",
      path: getImagePath(subject, "meaning")
    },
    {
      subjectId: subject.id,
      type: "reading",
      label: "Reading mnemonic",
      path: getImagePath(subject, "reading")
    }
  ];
}

function renderImageSlot(subject, type, label) {
  const imagePath = getImagePath(subject, type);

  return `
    <figure class="image-slot image-mode-contain">
      <img
        src="${imagePath}"
        alt="${escapeHtml(label)} image for ${escapeHtml(getMeaning(subject))}"
        loading="lazy"
        onclick="openImageLightboxForSubject(${subject.id}, '${type}')"
        onerror="this.parentElement.classList.add('image-missing'); this.remove();"
      />
      <div class="image-fallback">
        Missing ${escapeHtml(label)} image<br />
        Add image here:<br />
        <code>${escapeHtml(imagePath)}</code>
      </div>
    </figure>
  `;
}

function getLightboxStudyText(subject, type) {
  if (!subject || !showLightboxStudyText) return "";

  const isReading = type === "reading";
  const mnemonic = isReading ? subject.data.reading_mnemonic : subject.data.meaning_mnemonic;
  const hint = isReading
    ? subject.data.reading_hint ?? "No reading hint available yet."
    : subject.data.meaning_hint ?? "No meaning hint available yet.";

  return `
    <section class="image-lightbox-study-text">
      <p>${renderWaniKaniText(mnemonic)}</p>
      <details class="image-lightbox-hint" open>
        <summary>Hints</summary>
        <p>${renderWaniKaniText(hint)}</p>
      </details>
    </section>
  `;
}

function getLightboxStudyHeader(subject, type) {
  if (!subject) return "";

  const radicals = getRadicalComponents(subject);
  const primaryReadings = sortReadingsForCard(getPrimaryReadings(subject));
  const primaryReadingText = primaryReadings.length
    ? primaryReadings.map(reading => escapeHtml(formatReadingForDisplay(reading.reading, reading.type))).join(",&nbsp;")
    : "No primary reading";

  if (type === "reading") {
    return `
      <section class="image-lightbox-study-header image-lightbox-study-header-reading">
        <button type="button" class="image-lightbox-kanji ${getSubjectColorClass(subject)}" onclick="openSymbolLightbox('${escapeHtml(subject.data.characters)}', '${escapeHtml(getMeaning(subject))}', 'kanji')">${escapeHtml(subject.data.characters)}</button>
        <div class="image-lightbox-header-main">
          <div class="image-lightbox-header-label">Reading</div>
          <div class="image-lightbox-header-reading">${primaryReadingText}</div>
        </div>
      </section>
    `;
  }

  return `
    <section class="image-lightbox-study-header image-lightbox-study-header-meaning">
      <button type="button" class="image-lightbox-kanji ${getSubjectColorClass(subject)}" onclick="openSymbolLightbox('${escapeHtml(subject.data.characters)}', '${escapeHtml(getMeaning(subject))}', 'kanji')">${escapeHtml(subject.data.characters)}</button>
      <div class="image-lightbox-header-main">
        <div class="image-lightbox-header-label">Meaning</div>
        <div class="image-lightbox-header-meaning">${escapeHtml(getMeaning(subject))}</div>
      </div>
      <div class="image-lightbox-radicals" aria-label="Radicals">
        ${radicals.map(radical => `
          <div class="image-lightbox-radical-chip" title="${escapeHtml(getMeaning(radical))}">
            <button type="button" class="image-lightbox-radical-symbol" onclick="openSymbolLightbox('${escapeHtml(radical.data.characters ?? "?")}', '${escapeHtml(getMeaning(radical))}', 'radical')">${escapeHtml(radical.data.characters ?? "?")}</button>
            <span class="image-lightbox-radical-name">${escapeHtml(getMeaning(radical))}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function ensureSymbolLightbox() {
  let lightbox = document.getElementById("symbolLightbox");

  if (lightbox) return lightbox;

  lightbox = document.createElement("div");
  lightbox.id = "symbolLightbox";
  lightbox.className = "symbol-lightbox";
  lightbox.innerHTML = `
    <button class="symbol-lightbox-close" aria-label="Close symbol">×</button>
    <div id="symbolLightboxCard" class="symbol-lightbox-card">
      <div id="symbolLightboxCharacter" class="symbol-lightbox-character"></div>
      <div id="symbolLightboxLabel" class="symbol-lightbox-label"></div>
    </div>
  `;

  lightbox.addEventListener("click", event => {
    if (
      event.target.id === "symbolLightbox" ||
      event.target.classList.contains("symbol-lightbox-close")
    ) {
      closeSymbolLightbox();
    }
  });

  document.body.appendChild(lightbox);
  return lightbox;
}

function openSymbolLightbox(character, label, type = "kanji") {
  const lightbox = ensureSymbolLightbox();
  const characterElement = document.getElementById("symbolLightboxCharacter");
  const labelElement = document.getElementById("symbolLightboxLabel");

  if (!characterElement || !labelElement) return;

  characterElement.className = `symbol-lightbox-character ${getSubjectColorClassByType(type)}`;
  characterElement.textContent = character || "?";
  labelElement.textContent = label || "";

  lightbox.classList.add("is-open");
  document.body.classList.add("symbol-lightbox-open");
}

function closeSymbolLightbox() {
  const lightbox = document.getElementById("symbolLightbox");

  if (!lightbox) return;

  lightbox.classList.remove("is-open");
  document.body.classList.remove("symbol-lightbox-open");
}

function ensureImageLightbox() {
  let lightbox = document.getElementById("imageLightbox");

  if (lightbox) return lightbox;

  lightbox = document.createElement("div");
  lightbox.id = "imageLightbox";
  lightbox.className = "image-lightbox";
  lightbox.innerHTML = `
    <button class="image-lightbox-close" aria-label="Close image">×</button>
    <div id="imageLightboxStudyHeader" class="image-lightbox-study-header-wrap"></div>
    <button class="image-lightbox-nav image-lightbox-prev" aria-label="Previous image" onclick="event.stopPropagation(); navigateLightboxImage(-1)">‹</button>
    <img id="imageLightboxImage" alt="" />
    <button class="image-lightbox-nav image-lightbox-next" aria-label="Next image" onclick="event.stopPropagation(); navigateLightboxImage(1)">›</button>
    <div id="imageLightboxStudyText" class="image-lightbox-study-text-wrap"></div>
    <div id="imageLightboxCounter" class="image-lightbox-counter"></div>
  `;

  lightbox.addEventListener("click", event => {
    if (
      event.target.id === "imageLightbox" ||
      event.target.classList.contains("image-lightbox-close")
    ) {
      closeImageLightbox();
    }
  });

  document.body.appendChild(lightbox);
  return lightbox;
}

function openImageLightboxForSubject(subjectId, type) {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  lightboxImages = getSubjectImageGallery(subject).map(image => ({
    ...image,
    alt: `${image.label} image for ${getMeaning(subject)}`
  }));

  lightboxImageIndex = Math.max(0, lightboxImages.findIndex(image => image.type === type));
  openImageLightboxAtIndex(lightboxImageIndex);
}

function getLightboxKanjiSequence() {
  const rawSearch = document.getElementById("search").value.trim();

  if (rawSearch || !loopLightboxAcrossLevels) {
    return getCurrentKanjiList();
  }

  return subjects
    .filter(subject =>
      subject.object === "kanji" &&
      subject.data.hidden_at === null
    )
    .sort((a, b) => {
      if (a.data.level !== b.data.level) return a.data.level - b.data.level;
      return getMeaning(a).localeCompare(getMeaning(b));
    });
}

function openAdjacentKanjiInLightbox(direction) {
  if (!loopLightboxAcrossKanji || lightboxImages.length === 0) return false;

  const activeImage = lightboxImages[lightboxImageIndex];
  const activeSubjectId = activeImage?.subjectId;
  const sequence = getLightboxKanjiSequence();
  const currentIndex = sequence.findIndex(subject => subject.id === activeSubjectId);

  if (currentIndex < 0) return false;

  const targetIndex = currentIndex + direction;
  const targetSubject = sequence[targetIndex];

  if (!targetSubject) return false;

  currentSubjectId = targetSubject.id;
  saveSessionView("detail", targetSubject.id);
  showDetail(targetSubject.id);

  lightboxImages = getSubjectImageGallery(targetSubject).map(image => ({
    ...image,
    alt: `${image.label} image for ${getMeaning(targetSubject)}`
  }));

  const targetImageType = direction > 0 ? "meaning" : "reading";
  const targetImageIndex = Math.max(0, lightboxImages.findIndex(image => image.type === targetImageType));
  openImageLightboxAtIndex(targetImageIndex);
  return true;
}

function openImageLightboxAtIndex(index) {
  if (lightboxImages.length === 0) return;

  const lightbox = ensureImageLightbox();
  const image = document.getElementById("imageLightboxImage");
  const counter = document.getElementById("imageLightboxCounter");
  const studyHeader = document.getElementById("imageLightboxStudyHeader");
  const studyText = document.getElementById("imageLightboxStudyText");
  const activeImage = lightboxImages[index];
  const activeSubject = subjects.find(subject => subject.id === activeImage.subjectId);

  lightboxImageIndex = index;
  image.src = activeImage.path;
  image.alt = activeImage.alt;

  if (studyHeader) {
    studyHeader.innerHTML = showLightboxStudyHeader ? getLightboxStudyHeader(activeSubject, activeImage.type) : "";
    studyHeader.classList.toggle("hidden", !showLightboxStudyHeader);
  }

  if (studyText) {
    studyText.innerHTML = getLightboxStudyText(activeSubject, activeImage.type);
    studyText.classList.toggle("hidden", !showLightboxStudyText);
  }

  lightbox.classList.toggle("has-study-text", showLightboxStudyText);
  lightbox.classList.toggle("has-study-header", showLightboxStudyHeader);
  lightbox.classList.toggle("image-only", !showLightboxStudyText && !showLightboxStudyHeader);

  if (counter) {
    counter.textContent = `${activeImage.label} · ${index + 1} / ${lightboxImages.length}`;
  }

  lightbox.classList.add("is-open");
  document.body.classList.add("lightbox-open");
}

function navigateLightboxImage(direction) {
  if (lightboxImages.length <= 1) return;

  const nextIndex = lightboxImageIndex + direction;

  if (nextIndex >= 0 && nextIndex < lightboxImages.length) {
    openImageLightboxAtIndex(nextIndex);
    return;
  }

  if (openAdjacentKanjiInLightbox(direction)) return;

  const wrappedIndex = (nextIndex + lightboxImages.length) % lightboxImages.length;
  openImageLightboxAtIndex(wrappedIndex);
}

function closeImageLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  const image = document.getElementById("imageLightboxImage");
  const studyHeader = document.getElementById("imageLightboxStudyHeader");
  const studyText = document.getElementById("imageLightboxStudyText");

  if (!lightbox || !image) return;

  lightbox.classList.remove("is-open", "has-study-text", "has-study-header", "image-only");
  document.body.classList.remove("lightbox-open");
  image.src = "";
  image.alt = "";

  if (studyHeader) {
    studyHeader.innerHTML = "";
  }

  if (studyText) {
    studyText.innerHTML = "";
    studyText.classList.add("hidden");
  }
  lightboxImages = [];
  lightboxImageIndex = 0;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderWaniKaniText(text) {
  return escapeHtml(text)
    .replaceAll("&lt;radical&gt;", '<span class="wk-tag wk-tag-radical">')
    .replaceAll("&lt;/radical&gt;", "</span>")
    .replaceAll("&lt;kanji&gt;", '<span class="wk-tag wk-tag-kanji">')
    .replaceAll("&lt;/kanji&gt;", "</span>")
    .replaceAll("&lt;vocabulary&gt;", '<span class="wk-tag wk-tag-vocabulary">')
    .replaceAll("&lt;/vocabulary&gt;", "</span>")
    .replaceAll("&lt;reading&gt;", '<span class="wk-tag wk-tag-reading">')
    .replaceAll("&lt;/reading&gt;", "</span>");
}

function showList(options = {}) {
  currentSubjectId = null;

  if (!options.skipSessionSave) {
    saveSessionView("list");
  }

  document.querySelector(".controls").classList.remove("hidden");
  document.getElementById("stats").classList.remove("hidden");
  document.getElementById("listView").classList.remove("hidden");
  document.getElementById("detailView").classList.add("hidden");
}

function showDetail(subjectId, options = {}) {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  currentSubjectId = subjectId;
  saveSessionView("detail", subjectId);

  const primaryMeanings = getPrimaryMeanings(subject);
  const alternativeMeanings = getAlternativeMeanings(subject);
  const onyomi = getReadingsByType(subject, "onyomi");
  const kunyomi = getReadingsByType(subject, "kunyomi");
  const nanori = getReadingsByType(subject, "nanori");
  const adjacent = getAdjacentKanji(subject.id);

  document.querySelector(".controls").classList.add("hidden");
  document.getElementById("stats").classList.add("hidden");
  document.getElementById("listView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");

  document.getElementById("kanjiDetail").innerHTML = `
    <section id="kanjiSection" class="section-card kanji-section">
      <h2 class="section-title">Kanji</h2>
      <div class="divider"></div>

      <div class="detail-header">
        <div class="detail-symbol ${getSubjectColorClass(subject)}">
          ${escapeHtml(subject.data.characters)}
        </div>

        <div>
          <div class="page-title">${escapeHtml(getMeaning(subject))}</div>
          <p>Level ${subject.data.level} · ${escapeHtml(subject.object)}</p>
        </div>
      </div>
    </section>

    ${renderStudyHeader(subject)}

    <div class="kanji-switcher">
      <button class="kanji-switcher-button" onclick="navigateKanji(-1)" ${adjacent.previous ? "" : "disabled"}>
        ‹ ${adjacent.previous ? escapeHtml(adjacent.previous.data.characters) : ""}
      </button>

      <span class="kanji-switcher-status">
        ${adjacent.currentIndex + 1} / ${adjacent.total}
      </span>

      <button class="kanji-switcher-button" onclick="navigateKanji(1)" ${adjacent.next ? "" : "disabled"}>
        ${adjacent.next ? escapeHtml(adjacent.next.data.characters) : ""} ›
      </button>
    </div>

    <div class="detail-navigation">
      <button onclick="scrollToDetailSection('kanjiSection')">Kanji</button>
      <button onclick="scrollToDetailSection('radicalsSection')">Radical Combination</button>
      <button onclick="scrollToDetailSection('meaningSection')">Meaning</button>
      <button onclick="scrollToDetailSection('readingSection')">Reading</button>
      <button onclick="scrollToDetailSection('similarKanjiSection')">Visual Similar Kanji</button>
      <button onclick="scrollToDetailSection('foundVocabularySection')">Found In Vocabulary</button>
    </div>

    ${renderRadicalComponents(subject)}

    <div class="meaning-reading-layout">
      <section id="meaningSection" class="section-card">
        <h2 class="section-title">Meaning</h2>
        <div class="divider"></div>

      <div class="info-grid">
        <div class="info-box">
          <h4>Primary</h4>
          <p>${primaryMeanings.map(escapeHtml).join(", ")}</p>
        </div>

        <div class="info-box">
          <h4>Alternative</h4>
          <p>${alternativeMeanings.length ? alternativeMeanings.map(escapeHtml).join(", ") : "None"}</p>
        </div>
      </div>

      <div class="detail-section">
        <h3>Mnemonic</h3>
        <p>${renderWaniKaniText(subject.data.meaning_mnemonic)}</p>
      </div>

      <div class="hint-box">
        <strong>Hints</strong>
        <p>${renderWaniKaniText(subject.data.meaning_hint ?? "No meaning hint available yet.")}</p>
      </div>

        ${renderImageSlot(subject, "meaning", "Meaning mnemonic")}
      </section>

      <section id="readingSection" class="section-card">
        <h2 class="section-title">Reading</h2>
        <div class="divider"></div>

      <div class="info-grid">
        <div class="info-box">
          <h4>On’yomi</h4>
          <p>${renderReadingList(onyomi, "onyomi")}</p>
        </div>

        <div class="info-box">
          <h4>Kun’yomi</h4>
          <p>${renderReadingList(kunyomi, "kunyomi")}</p>
        </div>

        <div class="info-box">
          <h4>Nanori</h4>
          <p>${renderReadingList(nanori, "nanori")}</p>
        </div>
      </div>

      <div class="detail-section">
        <h3>Mnemonic</h3>
        <p>${renderWaniKaniText(subject.data.reading_mnemonic)}</p>
      </div>

      <div class="hint-box">
        <strong>Hints</strong>
        <p>${renderWaniKaniText(subject.data.reading_hint ?? "No reading hint available yet.")}</p>
      </div>

        <div id="imagesSection">${renderImageSlot(subject, "reading", "Reading mnemonic")}</div>
      </section>
    </div>

    <section id="similarKanjiSection" class="section-card">
      <h2 class="section-title">Visually Similar Kanji</h2>
      <div class="divider"></div>
      <p>Coming next: cards from visually similar kanji data.</p>
    </section>

    <section id="foundVocabularySection" class="section-card">
      <h2 class="section-title">Found In Vocabulary</h2>
      <div class="divider"></div>
      <p>Coming next: vocabulary that uses this kanji.</p>
    </section>
  `;

  requestAnimationFrame(() => {
    if (options.scrollToSectionId) {
      scrollToDetailSection(options.scrollToSectionId, "auto");
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function scrollToDetailSection(sectionId, behavior = "smooth") {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior,
    block: "start"
  });
}

function render() {
  const search = document.getElementById("search").value.trim();
  const level = getCurrentLevel();
  const filtered = getCurrentKanjiList();
  const title = search ? "Search Results" : `Level ${level}`;
  const description = search
    ? `${filtered.length} kanji matching “${escapeHtml(search)}”`
    : `${filtered.length} kanji ready to study`;

  document.getElementById("stats").innerHTML = `
    <div class="level-summary">
      <div>
        <h2>${title}</h2>
        <p>${description}</p>
      </div>
      <span class="level-pill">Kanji</span>
    </div>
  `;

  document.getElementById("cards").innerHTML = filtered.map(s => `
    <article class="card kanji-card" onclick="showDetail(${s.id})">
      <div class="kanji-card-symbol">${escapeHtml(s.data.characters)}</div>
      <div class="kanji-card-body">
        ${search ? `<div class="kanji-card-level">Level ${s.data.level}</div>` : ""}
        <div class="kanji-card-reading">${renderCardReadings(s)}</div>
        <div class="kanji-card-meaning">${escapeHtml(getMeaning(s))}</div>
      </div>
    </article>
  `).join("");
}

document.getElementById("search").addEventListener("input", () => {
  renderHeaderSearchResults();

  if (!currentSubjectId) {
    render();
  }
});
document.getElementById("levelSelect").addEventListener("change", event => {
  localStorage.setItem(SETTINGS_KEYS.level, event.target.value);
  renderLevelPicker();
  render();
});


document.getElementById("backButton").addEventListener("click", showList);

document.addEventListener("keydown", event => {
  const lightbox = document.getElementById("imageLightbox");
  const isLightboxOpen = lightbox?.classList.contains("is-open");

  if (event.key === "Escape") {
    const mobileMenuOpen = document.body.classList.contains("mobile-menu-open");

    if (mobileMenuOpen) {
      closeMobileMenu();
      return;
    }

    const symbolLightbox = document.getElementById("symbolLightbox");
    const isSymbolLightboxOpen = symbolLightbox?.classList.contains("is-open");

    if (isSymbolLightboxOpen) {
      closeSymbolLightbox();
      return;
    }

    if (isLightboxOpen) {
      closeImageLightbox();
      return;
    }

    if (currentSubjectId) {
      showList();
    }

    return;
  }

  if (!currentSubjectId) return;

  if (event.key === "ArrowLeft") {
    if (isLightboxOpen) {
      navigateLightboxImage(-1);
      return;
    }

    navigateKanji(-1);
  }

  if (event.key === "ArrowRight") {
    if (isLightboxOpen) {
      navigateLightboxImage(1);
      return;
    }

    navigateKanji(1);
  }
});


document.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
});

document.addEventListener("touchend", event => {
  const detailView = document.getElementById("detailView");
  const lightbox = document.getElementById("imageLightbox");

  if (detailView.classList.contains("hidden")) return;

  const touchEndX = event.changedTouches[0].screenX;
  const swipeDistance = touchEndX - touchStartX;
  const minimumSwipeDistance = 60;

  if (lightbox?.classList.contains("is-open")) {
    if (swipeDistance > minimumSwipeDistance) {
      navigateLightboxImage(-1);
    }

    if (swipeDistance < -minimumSwipeDistance) {
      navigateLightboxImage(1);
    }

    return;
  }

  if (swipeDistance > minimumSwipeDistance) {
    navigateKanji(-1);
  }

  if (swipeDistance < -minimumSwipeDistance) {
    navigateKanji(1);
  }
});

window.addEventListener("load", () => {
  updateAppHeaderHeight();
  updateHeaderLayoutMode();
});

window.addEventListener("resize", () => {
  updateAppHeaderHeight();
  updateHeaderLayoutMode();
});

window.addEventListener("orientationchange", () => {
  updateAppHeaderHeight();
  updateHeaderLayoutMode();
});

updateAppHeaderHeight();

loadData();