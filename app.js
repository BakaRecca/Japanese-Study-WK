const DEFAULT_LEVEL = 41;
const MIN_LEVEL = 1;
const MAX_LEVEL = 60;

let subjects = [];
let currentLang = "en";
let currentSubjectId = null;
let touchStartX = 0;

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

function getCurrentKanjiList() {
  const search = document.getElementById("search").value.toLowerCase();
  const level = Number(document.getElementById("levelSelect").value);

  const kanji = subjects.filter(s =>
    s.object === "kanji" &&
    s.data.level === level &&
    s.data.hidden_at === null
  );

  return kanji.filter(s => {
    const text = [
      s.data.characters,
      getMeaning(s),
      getReadings(s)
    ].join(" ").toLowerCase();

    return text.includes(search);
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

  if (target) {
    showDetail(target.id);
  }
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

function renderImageSlot(subject, type, label) {
  const imagePath = getImagePath(subject, type);

  return `
    <figure class="image-slot image-mode-contain">
      <img
        src="${imagePath}"
        alt="${escapeHtml(label)} image for ${escapeHtml(getMeaning(subject))}"
        loading="lazy"
        onclick="openImageLightbox('${imagePath}', '${escapeHtml(label)} image for ${escapeHtml(getMeaning(subject))}')"
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

function ensureImageLightbox() {
  let lightbox = document.getElementById("imageLightbox");

  if (lightbox) return lightbox;

  lightbox = document.createElement("div");
  lightbox.id = "imageLightbox";
  lightbox.className = "image-lightbox";
  lightbox.innerHTML = `
    <button class="image-lightbox-close" aria-label="Close image">×</button>
    <img id="imageLightboxImage" alt="" />
  `;

  lightbox.addEventListener("click", event => {
    if (
      event.target.id === "imageLightbox" ||
      event.target.classList.contains("image-lightbox-close") ||
      event.target.id === "imageLightboxImage"
    ) {
      closeImageLightbox();
    }
  });

  document.body.appendChild(lightbox);
  return lightbox;
}

function openImageLightbox(imagePath, altText) {
  const lightbox = ensureImageLightbox();
  const image = document.getElementById("imageLightboxImage");

  image.src = imagePath;
  image.alt = altText;
  lightbox.classList.add("is-open");
  document.body.classList.add("lightbox-open");
}

function closeImageLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  const image = document.getElementById("imageLightboxImage");

  if (!lightbox || !image) return;

  lightbox.classList.remove("is-open");
  document.body.classList.remove("lightbox-open");
  image.src = "";
  image.alt = "";
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
  currentSubjectId = null;
  document.querySelector(".controls").classList.remove("hidden");
  document.getElementById("stats").classList.remove("hidden");
  document.getElementById("listView").classList.remove("hidden");
  document.getElementById("detailView").classList.add("hidden");
}

function showDetail(subjectId) {
  const subject = subjects.find(s => s.id === subjectId);
  if (!subject) return;

  currentSubjectId = subjectId;

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
      <button onclick="scrollToDetailSection('radicalsSection')">Radicals</button>
      <button onclick="scrollToDetailSection('meaningSection')">Meaning</button>
      <button onclick="scrollToDetailSection('readingsSection')">Readings</button>
      <button onclick="scrollToDetailSection('similarKanjiSection')">Similar Kanji</button>
      <button onclick="scrollToDetailSection('foundVocabularySection')">Found In Vocabulary</button>
      <button onclick="scrollToDetailSection('imagesSection')">Images</button>
    </div>

    ${renderRadicalComponents(subject)}

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

      <div id="imagesSection">${renderImageSlot(subject, "reading", "Reading mnemonic")}</div>
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

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeImageLightbox();
  }
});


document.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].screenX;
});

document.addEventListener("touchend", event => {
  const detailView = document.getElementById("detailView");
  const lightbox = document.getElementById("imageLightbox");

  if (detailView.classList.contains("hidden")) return;
  if (lightbox?.classList.contains("is-open")) return;

  const touchEndX = event.changedTouches[0].screenX;
  const swipeDistance = touchEndX - touchStartX;
  const minimumSwipeDistance = 60;

  if (swipeDistance > minimumSwipeDistance) {
    navigateKanji(-1);
  }

  if (swipeDistance < -minimumSwipeDistance) {
    navigateKanji(1);
  }
});

loadData();