const corrections = {
  teh: "the", recieve: "receive", wierd: "weird", definately: "definitely",
  occured: "occurred", untill: "until", seperate: "separate", alot: "a lot",
  accomodate: "accommodate", adress: "address", goverment: "government",
  independant: "independent", neccessary: "necessary", recomend: "recommend",
  succesful: "successful", tommorow: "tomorrow", begining: "beginning",
  beleive: "believe", calender: "calendar", concious: "conscious",
  embarass: "embarrass", enviroment: "environment", existance: "existence",
  freind: "friend", occured: "occurred", persue: "pursue", relevent: "relevant",
  rythym: "rhythm", thier: "their", truely: "truly", wich: "which",
  woudl: "would", shoudl: "should", coudl: "could", isnt: "isn't", dont: "don't",
  doesnt: "doesn't", cant: "can't", wont: "won't", im: "I'm", ive: "I've",
  didnt: "didn't", thats: "that's", youre: "you're", itslef: "itself",
  langauge: "language", comunication: "communication", buisness: "business",
  acheive: "achieve", actualy: "actually", avaliable: "available",
  becuase: "because", comming: "coming", experiance: "experience",
  imediately: "immediately", knowlege: "knowledge", occassion: "occasion"
};

const sampleText = "i definately beleive teh new tool woudl help our buisness.  it can improve comunication and make every message more clear";
const els = Object.fromEntries([
  "inputText", "inputCounter", "charCounter", "resultContent", "qualityScore",
  "reviewList", "accuracyValue", "correctionCount", "checkedCount", "readingTime",
  "correctButton", "sampleButton", "pasteButton", "clearButton", "copyButton",
  "downloadButton", "undoButton", "acceptAllButton", "modeSelect", "themeButton",
  "toast", "historyList", "clearHistoryButton"
].map(id => [id, document.getElementById(id)]));

let state = { original: "", output: "", previous: "", changes: [] };
const HISTORY_KEY = "typeright-history";
const THEME_KEY = "typeright-theme";

function matchCase(source, replacement) {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function createChange(type, before, after) {
  return { id: crypto.randomUUID(), type, before, after, active: true, decision: "" };
}

function correctText(text, mode) {
  const changes = [];
  let output = text;

  output = output.replace(/\b[A-Za-z']+\b/g, word => {
    const replacement = corrections[word.toLowerCase()];
    if (!replacement) return word;
    const after = matchCase(word, replacement);
    changes.push(createChange("Spelling", word, after));
    return after;
  });

  if (mode !== "spelling") {
    output = output.replace(/ {2,}/g, spaces => {
      changes.push(createChange("Spacing", `${spaces.length} spaces`, "1 space"));
      return " ";
    });
    output = output.replace(/([!?.,])\1+/g, punctuation => {
      changes.push(createChange("Punctuation", punctuation, punctuation[0]));
      return punctuation[0];
    });
    output = output.replace(/(^|[.!?]\s+)([a-z])/g, (full, lead, letter) => {
      const after = letter.toUpperCase();
      changes.push(createChange("Capitalization", letter, after));
      return lead + after;
    });
    output = output.replace(/\bi\b/g, () => {
      changes.push(createChange("Capitalization", "i", "I"));
      return "I";
    });
  }

  if (mode === "polished") {
    output = output.replace(/\bvery\s+([a-z]+)/gi, (full, word) => {
      changes.push(createChange("Clarity", full, word));
      return word;
    });
    if (output && !/[.!?]$/.test(output.trim())) {
      changes.push(createChange("Punctuation", "No ending mark", "Period"));
      output = output.trimEnd() + ".";
    }
  }

  return { output, changes };
}

function getWords(text) {
  return (text.trim().match(/\b[\w']+\b/g) || []).length;
}

function setResult(text) {
  els.resultContent.classList.remove("empty");
  els.resultContent.textContent = text;
}

function renderReview() {
  if (!state.changes.length) {
    els.reviewList.innerHTML = '<p class="muted">No corrections needed. Your writing already looks clean.</p>';
    return;
  }
  els.reviewList.innerHTML = state.changes.map(change => `
    <div class="review-item ${change.active ? "" : "accepted"}">
      <span class="change-type">${change.type}</span>
      <span class="old-word">${escapeHtml(change.before)}</span>
      <span class="arrow">→</span>
      <span class="new-word">${escapeHtml(change.after)}</span>
      ${change.active ? `<span class="review-actions">
        <button class="mini-button" data-action="keep" data-id="${change.id}" type="button">Keep fix</button>
        <button class="mini-button reject" data-action="revert" data-id="${change.id}" type="button">Dismiss</button>
      </span>` : `<span class="review-actions"><span class="muted">${change.decision}</span></span>`}
    </div>
  `).join("");
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

function updateStats() {
  const words = getWords(state.original);
  const active = state.changes.filter(change => change.active).length;
  const score = words ? Math.max(72, Math.round(100 - (active / words) * 25)) : 100;
  els.accuracyValue.textContent = words ? `${score}%` : "—";
  els.qualityScore.textContent = words ? (active ? `${active} fixes` : "Looks clean") : "Ready";
  els.correctionCount.textContent = active;
  els.checkedCount.textContent = words;
  els.readingTime.textContent = `${words ? Math.max(1, Math.ceil(words / 220)) : 0} min`;
}

function updateInputStats() {
  const words = getWords(els.inputText.value);
  els.inputCounter.textContent = `${words} word${words === 1 ? "" : "s"}`;
  els.charCounter.textContent = `${els.inputText.value.length.toLocaleString()} / 4,000 characters`;
}

function runCorrection(addToHistory = true) {
  const text = els.inputText.value.trim();
  if (!text) return showToast("Add some text first.");
  state.previous = state.output;
  state.original = text;
  const result = correctText(text, els.modeSelect.value);
  state.output = result.output;
  state.changes = result.changes;
  setResult(state.output);
  renderReview();
  updateStats();
  setActionState(true);
  if (addToHistory) saveHistory(text, state.output, state.changes.length);
  showToast(state.changes.length ? `${state.changes.length} improvements found.` : "Your text is already clean.");
}

function setActionState(enabled) {
  els.copyButton.disabled = !enabled;
  els.downloadButton.disabled = !enabled;
  els.undoButton.disabled = !state.previous;
  els.acceptAllButton.disabled = !enabled || !state.changes.length;
}

function clearWorkspace() {
  els.inputText.value = "";
  state = { original: "", output: "", previous: "", changes: [] };
  els.resultContent.classList.add("empty");
  els.resultContent.innerHTML = '<div class="empty-state"><span class="empty-icon">✦</span><p>Your polished text will appear here.</p></div>';
  els.reviewList.innerHTML = '<p class="muted">Corrections will appear here after you check your text.</p>';
  updateInputStats();
  updateStats();
  setActionState(false);
}

function saveHistory(original, output, count) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift({ original, output, count, date: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 6)));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (!history.length) {
    els.historyList.innerHTML = '<p class="muted">Your recent corrections will stay here on this device.</p>';
    return;
  }
  els.historyList.innerHTML = history.map((item, index) => `
    <article class="history-item">
      <p>${escapeHtml(item.output)}</p>
      <div class="history-meta">
        <span>${item.count} fix${item.count === 1 ? "" : "es"}</span>
        <button class="text-button" data-history="${index}" type="button">Open</button>
      </div>
    </article>
  `).join("");
}

async function copyResult() {
  await navigator.clipboard.writeText(state.output);
  showToast("Result copied to clipboard.");
}

els.inputText.addEventListener("input", updateInputStats);
els.correctButton.addEventListener("click", () => runCorrection());
els.modeSelect.addEventListener("change", () => state.original && runCorrection(false));
els.sampleButton.addEventListener("click", () => {
  els.inputText.value = sampleText;
  updateInputStats();
  runCorrection();
});
els.clearButton.addEventListener("click", clearWorkspace);
els.pasteButton.addEventListener("click", async () => {
  try {
    els.inputText.value = await navigator.clipboard.readText();
    updateInputStats();
    showToast("Text pasted.");
  } catch {
    showToast("Clipboard access was blocked. Paste into the editor directly.");
  }
});
els.copyButton.addEventListener("click", () => copyResult().catch(() => showToast("Copy was blocked by your browser.")));
els.downloadButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([state.output], { type: "text/plain" }));
  link.download = "typeright-result.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Text file downloaded.");
});
els.undoButton.addEventListener("click", () => {
  if (!state.previous) return;
  state.output = state.previous;
  state.previous = "";
  setResult(state.output);
  setActionState(true);
  showToast("Previous result restored.");
});
els.acceptAllButton.addEventListener("click", () => {
  state.changes.forEach(change => {
    change.active = false;
    change.decision = "Accepted";
  });
  renderReview();
  updateStats();
  showToast("All fixes accepted.");
});
els.reviewList.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const change = state.changes.find(item => item.id === button.dataset.id);
  if (!change) return;
  change.active = false;
  if (button.dataset.action === "revert") {
    state.output = state.output.replace(change.after, change.before);
    change.decision = "Dismissed";
    setResult(state.output);
  } else {
    change.decision = "Accepted";
  }
  renderReview();
  updateStats();
});
els.historyList.addEventListener("click", event => {
  const button = event.target.closest("[data-history]");
  if (!button) return;
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const item = history[Number(button.dataset.history)];
  if (!item) return;
  els.inputText.value = item.original;
  updateInputStats();
  runCorrection(false);
  window.scrollTo({ top: 150, behavior: "smooth" });
});
els.clearHistoryButton.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("History cleared.");
});
els.themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

let toastTimer;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

if (localStorage.getItem(THEME_KEY) === "dark") document.body.classList.add("dark");
updateInputStats();
updateStats();
renderHistory();
