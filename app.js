(function () {
"use strict";

/* ============================================================
   Language registry
   ============================================================ */
const LANGUAGES = [
  { id: "text", name: "Plain Text", mime: "text/plain", ext: ["txt", "log"] },
  { id: "javascript", name: "JavaScript", mime: "text/javascript", ext: ["js", "mjs", "cjs"] },
  { id: "jsx", name: "JSX", mime: "text/jsx", ext: ["jsx"] },
  { id: "typescript", name: "TypeScript", mime: "text/typescript", ext: ["ts", "tsx"] },
  { id: "json", name: "JSON", mime: "application/json", ext: ["json"] },
  { id: "python", name: "Python", mime: "text/x-python", ext: ["py"] },
  { id: "html", name: "HTML", mime: "text/html", ext: ["html", "htm"] },
  { id: "css", name: "CSS", mime: "text/css", ext: ["css"] },
  { id: "xml", name: "XML", mime: "application/xml", ext: ["xml"] },
  { id: "markdown", name: "Markdown", mime: "text/x-markdown", ext: ["md", "markdown"] },
  { id: "c", name: "C", mime: "text/x-csrc", ext: ["c", "h"] },
  { id: "cpp", name: "C++", mime: "text/x-c++src", ext: ["cpp", "cc", "cxx", "hpp"] },
  { id: "csharp", name: "C#", mime: "text/x-csharp", ext: ["cs"] },
  { id: "java", name: "Java", mime: "text/x-java", ext: ["java"] },
  { id: "php", name: "PHP", mime: "application/x-httpd-php", ext: ["php"] },
  { id: "ruby", name: "Ruby", mime: "text/x-ruby", ext: ["rb"] },
  { id: "go", name: "Go", mime: "text/x-go", ext: ["go"] },
  { id: "rust", name: "Rust", mime: "text/x-rustsrc", ext: ["rs"] },
  { id: "swift", name: "Swift", mime: "text/x-swift", ext: ["swift"] },
  { id: "sql", name: "SQL", mime: "text/x-sql", ext: ["sql"] },
  { id: "shell", name: "Shell", mime: "text/x-sh", ext: ["sh", "bash"] },
  { id: "yaml", name: "YAML", mime: "text/x-yaml", ext: ["yml", "yaml"] },
  { id: "toml", name: "TOML", mime: "text/x-toml", ext: ["toml"] },
  { id: "perl", name: "Perl", mime: "text/x-perl", ext: ["pl"] },
  { id: "lua", name: "Lua", mime: "text/x-lua", ext: ["lua"] },
  { id: "powershell", name: "PowerShell", mime: "application/x-powershell", ext: ["ps1"] },
  { id: "dockerfile", name: "Dockerfile", mime: "text/x-dockerfile", ext: ["dockerfile"] },
];
const EXT_MAP = {};
LANGUAGES.forEach(l => l.ext.forEach(e => EXT_MAP[e] = l));
const langById = id => LANGUAGES.find(l => l.id === id) || LANGUAGES[0];
const langByFilename = name => {
  const base = name.toLowerCase();
  if (base === "dockerfile") return langById("dockerfile");
  const ext = base.includes(".") ? base.split(".").pop() : "";
  return EXT_MAP[ext] || LANGUAGES[0];
};

/* ============================================================
   State
   ============================================================ */
let tabs = [];
let activeId = null;
let nextId = 1;
let editor = null;
let settings = {
  wordWrap: false,
  theme: "dark",
};

const SESSION_KEY = "scribe.session.v1";
const SETTINGS_KEY = "scribe.settings.v1";

/* ============================================================
   DOM refs
   ============================================================ */
const $ = sel => document.querySelector(sel);
const tabstripEl = $("#tabstrip");
const findbarEl = $("#findbar");
const findInput = $("#find-input");
const replaceInput = $("#replace-input");
const findCountEl = $("#find-count");
const dropzoneEl = $("#dropzone");
const fileInput = $("#file-input");
const langPopover = $("#lang-popover");

/* ============================================================
   Tab model helpers
   ============================================================ */
function makeTab(title, content, lang, fileHandle, eol, startDirty) {
  // A Doc created directly with content via the constructor starts "clean"
  // (no undoable edits yet). To restore a tab that was unsaved when the
  // session was persisted, we track dirty state separately via a flag on
  // the tab object itself — we don't rely on CodeMirror's isClean() for
  // persisted dirty state, since setValue + markClean combos are fragile.
  const doc = new CodeMirror.Doc(content || "", lang.mime);
  return {
    id: nextId++,
    title,
    doc,
    lang,
    fileHandle: fileHandle || null,
    eol: eol || "LF",
    _dirtyOverride: startDirty ? true : undefined,
  };
}

function activeTab() {
  return tabs.find(t => t.id === activeId);
}

function isDirty(tab) {
  // _dirtyOverride is set for tabs restored from a previous session that
  // had unsaved content; cleared once the doc is actually edited or saved.
  if (tab._dirtyOverride) return true;
  return !tab.doc.isClean();
}

/* ============================================================
   Editor init
   ============================================================ */
function initEditor() {
  editor = CodeMirror(document.getElementById("editor-host"), {
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    lineWrapping: settings.wordWrap,
    tabSize: 4,
    indentUnit: 4,
    indentWithTabs: false,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    extraKeys: {
      "Tab": cm => {
        if (cm.somethingSelected()) cm.indentSelection("add");
        else cm.replaceSelection(" ".repeat(cm.getOption("indentUnit")), "end");
      },
      "Shift-Tab": cm => cm.indentSelection("subtract"),
    },
  });

  editor.on("cursorActivity", updateStatusPosition);
  editor.on("change", () => {
    // Clear the persisted dirty override on the first real user edit;
    // from here CodeMirror's own isClean() takes over.
    const tab = activeTab();
    if (tab && tab._dirtyOverride) tab._dirtyOverride = undefined;
    scheduleAutosave();
    renderActiveTabDirty();
  });
}

/* ============================================================
   Rendering: tabs
   ============================================================ */
function renderTabs() {
  tabstripEl.innerHTML = "";
  tabs.forEach(tab => {
    const el = document.createElement("div");
    el.className = "tab" + (tab.id === activeId ? " active" : "") + (isDirty(tab) ? " is-dirty" : "");
    el.dataset.id = tab.id;
    el.title = tab.title;
    el.innerHTML = `
      <span class="tab-icon"></span>
      <span class="tab-title"></span>
      <span class="tab-dirty"></span>
      <span class="tab-close" title="Close">
        <svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </span>
    `;
    el.querySelector(".tab-title").textContent = tab.title;
    el.addEventListener("click", (e) => {
      if (e.target.closest(".tab-close")) return;
      switchTab(tab.id);
    });
    el.querySelector(".tab-close").addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    tabstripEl.appendChild(el);
  });
  const activeEl = tabstripEl.querySelector(".tab.active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderActiveTabDirty() {
  const tab = activeTab();
  if (!tab) return;
  const el = tabstripEl.querySelector(`.tab[data-id="${tab.id}"]`);
  if (el) el.classList.toggle("is-dirty", isDirty(tab));
}

/* ============================================================
   Tab actions
   ============================================================ */
function newTab(title, content, lang, fileHandle, eol) {
  lang = lang || LANGUAGES[0];
  const tab = makeTab(title || "untitled", content || "", lang, fileHandle, eol);
  tabs.push(tab);
  switchTab(tab.id);
  return tab;
}

function switchTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  activeId = id;
  editor.swapDoc(tab.doc);
  editor.focus();
  renderTabs();
  updateStatusAll();
  closeFindbar();
}

async function closeTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  if (isDirty(tab)) {
    const ok = await confirmDialog(
      `"${tab.title}" has unsaved changes. Close without saving?`,
      { okText: "Close without saving", cancelText: "Cancel", danger: true }
    );
    if (!ok) return;
  }
  const idx = tabs.indexOf(tab);
  tabs.splice(idx, 1);
  if (tabs.length === 0) {
    newTab("untitled", "", LANGUAGES[0]);
    saveSession();
    return;
  }
  if (activeId === id) {
    const next = tabs[idx] || tabs[idx - 1];
    switchTab(next.id);
  } else {
    renderTabs();
  }
  saveSession();
}

function cycleTab(dir) {
  if (tabs.length < 2) return;
  const idx = tabs.findIndex(t => t.id === activeId);
  const next = (idx + dir + tabs.length) % tabs.length;
  switchTab(tabs[next].id);
}

/* ============================================================
   File: New / Open / Save
   ============================================================ */
const hasFSAccess = "showOpenFilePicker" in window;

async function actionNew() {
  newTab("untitled", "", LANGUAGES[0]);
  saveSession();
}

async function actionOpen() {
  if (hasFSAccess) {
    try {
      const handles = await window.showOpenFilePicker({ multiple: true });
      for (const handle of handles) await openFileHandle(handle);
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  } else {
    fileInput.click();
  }
}

fileInput.addEventListener("change", async () => {
  for (const file of Array.from(fileInput.files)) {
    await openFileObject(file, null);
  }
  fileInput.value = "";
});

async function openFileHandle(handle) {
  const file = await handle.getFile();
  await openFileObject(file, handle);
}

async function openFileObject(file, handle) {
  const text = await file.text();
  const eol = text.includes("\r\n") ? "CRLF" : "LF";
  const normalized = text.replace(/\r\n/g, "\n");
  const lang = langByFilename(file.name);
  newTab(file.name, normalized, lang, handle, eol);
  saveSession();
}

async function actionSave(saveAs) {
  const tab = activeTab();
  if (!tab) return;

  const content = tab.eol === "CRLF" ? tab.doc.getValue().replace(/\n/g, "\r\n") : tab.doc.getValue();

  if (hasFSAccess) {
    try {
      let handle = tab.fileHandle;
      if (saveAs || !handle) {
        handle = await window.showSaveFilePicker({
          suggestedName: tab.title === "untitled" ? "untitled.txt" : tab.title,
        });
        tab.fileHandle = handle;
      }
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      tab.title = handle.name;
      tab.lang = langByFilename(handle.name);
      tab.doc.markClean();
      tab._dirtyOverride = false;
      renderTabs();
      updateStatusAll();
      saveSession();
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  } else {
    // Fallback: prompt for filename, then download
    let filename = tab.title;
    if (saveAs || filename === "untitled") {
      const name = await promptDialog("Save file as", filename === "untitled" ? "untitled.txt" : filename);
      if (name === null) return;
      filename = name || filename;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    tab.title = filename;
    tab.lang = langByFilename(filename);
    tab.doc.markClean();
    tab._dirtyOverride = false;
    renderTabs();
    updateStatusAll();
    saveSession();
  }
}

/* ============================================================
   Drag & drop
   ============================================================ */
let dragCounter = 0;
window.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer.types.includes("Files")) return;
  dragCounter++;
  dropzoneEl.hidden = false;
});
window.addEventListener("dragleave", () => {
  dragCounter = Math.max(0, dragCounter - 1);
  if (dragCounter === 0) dropzoneEl.hidden = true;
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropzoneEl.hidden = true;
  const files = Array.from(e.dataTransfer.files || []);
  for (const file of files) await openFileObject(file, null);
});

/* ============================================================
   Status bar
   ============================================================ */
function updateStatusPosition() {
  const cur = editor.getCursor();
  $("#stat-position").textContent = `Ln ${cur.line + 1}, Col ${cur.ch + 1}`;
  const sel = editor.getSelection();
  $("#stat-selection").textContent = sel ? `${sel.length} selected` : "";
  $("#stat-length").textContent = `${editor.getValue().length} chars · ${editor.lineCount()} lines`;
}

function updateStatusAll() {
  const tab = activeTab();
  updateStatusPosition();
  $("#stat-wrap").textContent = "Wrap: " + (settings.wordWrap ? "On" : "Off");
  $("#stat-eol").textContent = tab.eol;
  $("#stat-lang").textContent = tab.lang.name;
}

/* ============================================================
   Language popover
   ============================================================ */
$("#stat-lang").addEventListener("click", (e) => {
  const tab = activeTab();
  langPopover.innerHTML = "";
  LANGUAGES.forEach(l => {
    const opt = document.createElement("div");
    opt.className = "lang-option" + (l.id === tab.lang.id ? " active" : "");
    opt.textContent = l.name;
    opt.addEventListener("click", () => {
      tab.lang = l;
      editor.setOption("mode", l.mime);
      updateStatusAll();
      langPopover.hidden = true;
    });
    langPopover.appendChild(opt);
  });
  const rect = e.target.getBoundingClientRect();
  const popoverH = Math.min(320, LANGUAGES.length * 32 + 12);
  const topAbove = rect.top - popoverH - 8;
  const topBelow = rect.bottom + 4;
  // Prefer opening above; fall back to below if not enough room
  const top = topAbove >= 8 ? topAbove : topBelow;
  langPopover.style.left = Math.max(8, rect.right - 190) + "px";
  langPopover.style.top = Math.max(8, top) + "px";
  langPopover.hidden = false;
});
document.addEventListener("click", (e) => {
  if (!langPopover.hidden && !langPopover.contains(e.target) && e.target.id !== "stat-lang") {
    langPopover.hidden = true;
  }
});

/* ============================================================
   Word wrap / EOL toggles
   ============================================================ */
$("#stat-wrap").addEventListener("click", () => {
  settings.wordWrap = !settings.wordWrap;
  editor.setOption("lineWrapping", settings.wordWrap);
  updateStatusAll();
  saveSettings();
});
$("#stat-eol").addEventListener("click", () => {
  const tab = activeTab();
  tab.eol = tab.eol === "LF" ? "CRLF" : "LF";
  updateStatusAll();
});

/* ============================================================
   Find & Replace
   ============================================================ */
let findState = { matchCase: false, wholeWord: false, regex: false };

function openFindbar(focusReplace) {
  findbarEl.hidden = false;
  const sel = editor.getSelection();
  if (sel) findInput.value = sel;
  (focusReplace ? replaceInput : findInput).focus();
  (focusReplace ? replaceInput : findInput).select();
  runSearch();
}
function closeFindbar() {
  findbarEl.hidden = true;
  clearSearchHighlight();
}

function buildQuery() {
  const raw = findInput.value;
  if (!raw) return null;
  if (findState.regex) {
    try {
      let pattern = raw;
      if (findState.wholeWord) pattern = `\\b(?:${pattern})\\b`;
      return new RegExp(pattern, findState.matchCase ? "g" : "gi");
    } catch (e) {
      return null;
    }
  }
  let pattern = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (findState.wholeWord) pattern = `\\b${pattern}\\b`;
  return new RegExp(pattern, findState.matchCase ? "g" : "gi");
}

let searchMarks = [];
function clearSearchHighlight() {
  searchMarks.forEach(m => m.clear());
  searchMarks = [];
}

function runSearch(advance) {
  clearSearchHighlight();
  const query = buildQuery();
  if (!query) {
    findCountEl.textContent = "0/0";
    return;
  }
  const doc = editor.getDoc();
  const cursor = doc.getSearchCursor(query, { line: 0, ch: 0 });
  const ranges = [];
  while (cursor.findNext()) {
    ranges.push([cursor.from(), cursor.to()]);
  }
  ranges.forEach(([from, to]) => {
    searchMarks.push(doc.markText(from, to, { className: "search-hl" }));
  });

  if (ranges.length === 0) {
    findCountEl.textContent = "0/0";
    return;
  }

  const curPos = editor.getCursor("from");
  // Find the first match that starts at or after the cursor
  let idx = ranges.findIndex(([from]) =>
    from.line > curPos.line || (from.line === curPos.line && from.ch >= curPos.ch)
  );
  if (idx === -1) idx = 0;

  if (advance === "next") {
    // Advance past the current selection if it already sits on this match
    const sel = editor.getSelection();
    if (sel) {
      const [matchFrom] = ranges[idx];
      if (matchFrom.line === curPos.line && matchFrom.ch === curPos.ch) {
        idx = (idx + 1) % ranges.length;
      }
    }
  } else if (advance === "prev") {
    // Go to the match just before the cursor
    idx = idx - 1;
    if (idx < 0) idx = ranges.length - 1;
  }

  const [from, to] = ranges[idx];
  editor.setSelection(from, to);
  editor.scrollIntoView({ from, to }, 60);
  findCountEl.textContent = `${idx + 1}/${ranges.length}`;
}

// live highlight style
const styleTag = document.createElement("style");
styleTag.textContent = `.search-hl { background: var(--accent-dim); outline: 1px solid var(--accent); border-radius: 2px; }`;
document.head.appendChild(styleTag);

findInput.addEventListener("input", () => runSearch());
findInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runSearch(e.shiftKey ? "prev" : "next");
  } else if (e.key === "Escape") {
    closeFindbar();
  }
});
replaceInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFindbar();
  if (e.key === "Enter") { e.preventDefault(); doReplaceOne(); }
});
$("#find-next").addEventListener("click", () => runSearch("next"));
$("#find-prev").addEventListener("click", () => runSearch("prev"));
$("#find-close").addEventListener("click", closeFindbar);
$("#find-case").addEventListener("click", (e) => {
  findState.matchCase = !findState.matchCase;
  e.target.classList.toggle("active", findState.matchCase);
  runSearch();
});
$("#find-word").addEventListener("click", (e) => {
  findState.wholeWord = !findState.wholeWord;
  e.target.classList.toggle("active", findState.wholeWord);
  runSearch();
});
$("#find-regex").addEventListener("click", (e) => {
  findState.regex = !findState.regex;
  e.target.classList.toggle("active", findState.regex);
  runSearch();
});

function doReplaceOne() {
  const query = buildQuery();
  if (!query) return;
  const sel = editor.getSelection();
  if (sel) {
    // Reset lastIndex before testing to avoid stale state on global regexes
    query.lastIndex = 0;
    if (query.test(sel)) {
      editor.replaceSelection(replaceInput.value);
    }
  }
  runSearch("next");
}
function doReplaceAll() {
  const query = buildQuery();
  if (!query) return;
  const doc = editor.getDoc();
  const cursor = doc.getSearchCursor(query, { line: 0, ch: 0 });
  let count = 0;
  editor.operation(() => {
    while (cursor.findNext()) {
      cursor.replace(replaceInput.value);
      count++;
    }
  });
  runSearch();
}
$("#replace-one").addEventListener("click", doReplaceOne);
$("#replace-all").addEventListener("click", doReplaceAll);

/* ============================================================
   Theme
   ============================================================ */
function sunIcon() {
  return `<circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M10 2.5v2"/><path d="M10 15.5v2"/><path d="M2.5 10h2"/><path d="M15.5 10h2"/>
      <path d="M4.6 4.6l1.4 1.4"/><path d="M14 14l1.4 1.4"/><path d="M15.4 4.6L14 6"/><path d="M6 14l-1.4 1.4"/>
    </g>`;
}
function moonIcon() {
  return `<path d="M16 12.5A6.5 6.5 0 1 1 7.5 4a5 5 0 0 0 8.5 8.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
}
function applyTheme() {
  document.body.classList.toggle("theme-light", settings.theme === "light");
  $("#theme-icon").innerHTML = settings.theme === "light" ? moonIcon() : sunIcon();
}
$("#btn-theme").addEventListener("click", () => {
  settings.theme = settings.theme === "light" ? "dark" : "light";
  applyTheme();
  saveSettings();
});

/* ============================================================
   Modal (confirm / prompt)
   ============================================================ */
const modalBackdrop = $("#modal-backdrop");
const modalMessage = $("#modal-message");
const modalActions = $("#modal-actions");

function confirmDialog(message, opts) {
  opts = opts || {};
  return new Promise(resolve => {
    modalMessage.textContent = message;
    modalActions.innerHTML = "";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = opts.cancelText || "Cancel";
    cancelBtn.addEventListener("click", () => { modalBackdrop.hidden = true; resolve(false); });
    const okBtn = document.createElement("button");
    okBtn.textContent = opts.okText || "OK";
    okBtn.className = opts.danger ? "danger" : "primary";
    okBtn.addEventListener("click", () => { modalBackdrop.hidden = true; resolve(true); });
    modalActions.appendChild(cancelBtn);
    modalActions.appendChild(okBtn);
    modalBackdrop.hidden = false;
    okBtn.focus();
  });
}

function promptDialog(message, defaultValue) {
  return new Promise(resolve => {
    modalMessage.innerHTML = "";
    const label = document.createElement("div");
    label.textContent = message;
    label.style.marginBottom = "8px";
    const input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue || "";
    input.style.cssText = "width:100%;background:var(--bg-void);border:1px solid var(--border);border-radius:5px;color:var(--text-primary);padding:7px 9px;font-size:13px;font-family:var(--sans);box-sizing:border-box;";
    modalMessage.appendChild(label);
    modalMessage.appendChild(input);
    modalActions.innerHTML = "";
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => { modalBackdrop.hidden = true; resolve(null); });
    const okBtn = document.createElement("button");
    okBtn.textContent = "Save";
    okBtn.className = "primary";
    const submit = () => { modalBackdrop.hidden = true; resolve(input.value.trim()); };
    okBtn.addEventListener("click", submit);
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { modalBackdrop.hidden = true; resolve(null); } });
    modalActions.appendChild(cancelBtn);
    modalActions.appendChild(okBtn);
    modalBackdrop.hidden = false;
    setTimeout(() => { input.focus(); input.select(); }, 0);
  });
}

/* ============================================================
   Persistence
   ============================================================ */
let autosaveTimer = null;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveSession, 400);
}
function saveSession() {
  try {
    const activeIdx = tabs.findIndex(t => t.id === activeId);
    const data = {
      activeIdx,
      tabs: tabs.map(t => ({
        title: t.title,
        content: t.doc.getValue(),
        langId: t.lang.id,
        eol: t.eol,
        dirty: isDirty(t),
      })),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) { /* storage full or unavailable — ignore */ }
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.tabs || !data.tabs.length) return false;
    data.tabs.forEach(t => {
      const tab = makeTab(t.title, t.content, langById(t.langId), null, t.eol, t.dirty);
      tabs.push(tab);
    });
    // Restore active tab by index (not stale ID from previous session)
    const activeIdx = typeof data.activeIdx === "number" ? data.activeIdx : 0;
    activeId = (tabs[activeIdx] || tabs[0]).id;
    return true;
  } catch (e) {
    return false;
  }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) settings = Object.assign(settings, JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

window.addEventListener("beforeunload", (e) => {
  saveSession();
  if (tabs.some(isDirty)) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ============================================================
   Keyboard shortcuts
   ============================================================ */
document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  const k = e.key.toLowerCase();

  if (k === "n" && !e.shiftKey) { e.preventDefault(); actionNew(); }
  else if (k === "o") { e.preventDefault(); actionOpen(); }
  else if (k === "s" && e.shiftKey) { e.preventDefault(); actionSave(true); }
  else if (k === "s") { e.preventDefault(); actionSave(false); }
  else if (k === "w") { e.preventDefault(); closeTab(activeId); }
  else if (k === "f") { e.preventDefault(); openFindbar(false); }
  else if (k === "h") { e.preventDefault(); openFindbar(true); }
  else if (k === "tab") { e.preventDefault(); cycleTab(e.shiftKey ? -1 : 1); }
  else if (k >= "1" && k <= "9") {
    const idx = parseInt(k, 10) - 1;
    if (e.altKey && tabs[idx]) { e.preventDefault(); switchTab(tabs[idx].id); }
  }
});

/* ============================================================
   Toolbar wiring
   ============================================================ */
$("#btn-new").addEventListener("click", actionNew);
$("#btn-tab-add").addEventListener("click", actionNew);
$("#btn-open").addEventListener("click", actionOpen);
$("#btn-save").addEventListener("click", () => actionSave(false));
$("#btn-saveas").addEventListener("click", () => actionSave(true));
$("#btn-undo").addEventListener("click", () => editor.undo());
$("#btn-redo").addEventListener("click", () => editor.redo());
$("#btn-find").addEventListener("click", () => openFindbar(false));

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  loadSettings();
  applyTheme();
  initEditor();

  const restored = loadSession();
  if (!restored) {
    newTab("untitled", "", LANGUAGES[0]);
  } else {
    switchTab(activeId);
  }
  updateStatusAll();
  renderTabs();
}

boot();
})();
