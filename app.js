const DEFAULT_LEVEL = 41;
const MIN_LEVEL = 1;
const MAX_LEVEL = 60;

let subjects = [];
let currentLang = "en";

async function loadData() {
  const response = await fetch("data/wanikani-subjects.json");
  const json = await response.json();
  subjects = json.subjects ?? json;
  setupLevelSelect();
  render();
}

function setupLevelSelect() {
  const levelSelect = document.getElementById("levelSelect");

  levelSelect.innerHTML = "";

  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = `Level ${level}`;
    option.selected = level === DEFAULT_LEVEL;
    levelSelect.appendChild(option);
  }
}

function getMeaning(subject) {
  const primary = subject.data.meanings?.find(m => m.primary);
  return primary?.meaning ?? "Unknown";
}

function getReadings(subject) {
  return subject.data.readings?.map(r => r.reading).join(", ") ?? "";
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

function renderReadingList(readings) {
  if (readings.length === 0) return "None";

  return readings.map(reading => {
    const className = reading.primary ? "primary-reading" : "";
    return `<span class="${className}">${escapeHtml(reading.reading)}</span>`;
  }).join(", ");
}

function getSubjectColorClass(subject) {
  if (subject.object === "radical") return "detail-symbol-radical";
  if (subject.object === "kanji") return "detail-symbol-kanji";
  return "detail-symbol-vocabulary";
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

function showList() {
  document.querySelector(".controls").classList.remove("hidden");
  document.getElementById("stats").classList.remove("hidden");
  document.getElementById("listView").classList.remove("hidden");
  document.getElementById("detailView").classList.add("hidden");
}

function showDetail(subjectId) {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  const primaryMeanings = getPrimaryMeanings(subject);
  const alternativeMeanings = getAlternativeMeanings(subject);
  const onyomi = getReadingsByType(subject, "onyomi");
  const kunyomi = getReadingsByType(subject, "kunyomi");
  const nanori = getReadingsByType(subject, "nanori");

  document.querySelector(".controls").classList.add("hidden");
  document.getElementById("stats").classList.add("hidden");
  document.getElementById("listView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });

  document.getElementById("kanjiDetail").innerHTML = `
    <div class="detail-header">
      <div class="detail-symbol ${getSubjectColorClass(subject)}">
        ${escapeHtml(subject.data.characters)}
      </div>

      <div>
        <div class="page-title">${escapeHtml(getMeaning(subject))}</div>
        <p>Level ${subject.data.level} · ${escapeHtml(subject.object)}</p>
      </div>
    </div>

    <div class="detail-navigation">
      <button onclick="scrollToDetailSection('meaningSection')">Meaning</button>
      <button onclick="scrollToDetailSection('readingsSection')">Readings</button>
      <button onclick="scrollToDetailSection('similarKanjiSection')">Similar Kanji</button>
      <button onclick="scrollToDetailSection('foundVocabularySection')">Found In Vocabulary</button>
      <button onclick="scrollToDetailSection('imagesSection')">Images</button>
    </div>

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

      <div class="image-placeholder">
        Meaning image placeholder
      </div>
    </section>

    <section id="readingsSection" class="section-card">
      <h2 class="section-title">Readings</h2>
      <div class="divider"></div>

      <div class="info-grid">
        <div class="info-box">
          <h4>On’yomi</h4>
          <p>${renderReadingList(onyomi)}</p>
        </div>

        <div class="info-box">
          <h4>Kun’yomi</h4>
          <p>${renderReadingList(kunyomi)}</p>
        </div>

        <div class="info-box">
          <h4>Nanori</h4>
          <p>${renderReadingList(nanori)}</p>
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

      <div id="imagesSection" class="image-placeholder">
        Reading image placeholder
      </div>
    </section>

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
}

function scrollToDetailSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function render() {
  const search = document.getElementById("search").value.toLowerCase();
  const level = Number(document.getElementById("levelSelect").value);

  const kanji = subjects.filter(s =>
    s.object === "kanji" &&
    s.data.level === level &&
    s.data.hidden_at === null
  );

  const filtered = kanji.filter(s => {
    const text = [
      s.data.characters,
      getMeaning(s),
      getReadings(s)
    ].join(" ").toLowerCase();

    return text.includes(search);
  });

  document.getElementById("stats").innerHTML = `
    <div class="level-summary">
      <div>
        <h2>Level ${level}</h2>
        <p>${filtered.length} kanji ready to study</p>
      </div>
      <span class="level-pill">Kanji</span>
    </div>
  `;

  document.getElementById("cards").innerHTML = filtered.map(s => `
    <article class="card kanji-card" onclick="showDetail(${s.id})">
      <div class="kanji-card-symbol">${escapeHtml(s.data.characters)}</div>
      <div class="kanji-card-body">
        <div class="kanji-card-meaning">${escapeHtml(getMeaning(s))}</div>
        <div class="kanji-card-reading">${escapeHtml(getReadings(s))}</div>
      </div>
    </article>
  `).join("");
}

document.getElementById("search").addEventListener("input", render);
document.getElementById("levelSelect").addEventListener("change", render);

document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "sv" : "en";
  render();
});

document.getElementById("backButton").addEventListener("click", showList);

loadData();