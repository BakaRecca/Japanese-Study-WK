let subjects = [];
let currentLang = "en";

async function loadData() {
  const response = await fetch("data/wanikani-subjects.json");
  const json = await response.json();
  subjects = json.subjects ?? json;
  render();
}

function getMeaning(subject) {
  const primary = subject.data.meanings?.find(m => m.primary);
  return primary?.meaning ?? "Unknown";
}

function getReadings(subject) {
  return subject.data.readings?.map(r => r.reading).join(", ") ?? "";
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

  document.getElementById("stats").innerHTML =
    `<p>${filtered.length} kanji på level ${level}</p>`;

  document.getElementById("cards").innerHTML = filtered.map(s => `
    <article class="card">
      <div class="kanji">${s.data.characters}</div>
      <div class="meaning">${getMeaning(s)}</div>
      <div class="reading">${getReadings(s)}</div>
      <details>
        <summary>Mnemonic</summary>
        <p>${s.data.meaning_mnemonic ?? ""}</p>
        <p>${s.data.reading_mnemonic ?? ""}</p>
      </details>
    </article>
  `).join("");
}

document.getElementById("search").addEventListener("input", render);
document.getElementById("langToggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "sv" : "en";
  render();
});

loadData();