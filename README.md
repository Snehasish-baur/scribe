# Scribe

A fast, multi-tab, syntax-highlighting notepad for the browser — a Notepad++-style
editor that runs entirely client-side (no backend, no build step).

## Features

- **Multi-tab editing** with per-tab undo history, unsaved-change indicators, and
  session restore (your open tabs survive a page reload via `localStorage`).
- **Syntax highlighting** for ~25 languages (JS/TS/JSX, Python, HTML, CSS, JSON,
  XML, Markdown, C/C++/C#/Java, PHP, Ruby, Go, Rust, Swift, SQL, Shell, YAML,
  TOML, Perl, Lua, PowerShell, Dockerfile, plain text), auto-detected from file
  extension or switchable from the status bar.
- **Real file open/save** using the File System Access API in Chromium browsers
  (edits save back to the original file on disk); falls back to file-input /
  download in Safari and Firefox.
- **Drag & drop** files straight onto the editor to open them.
- **Find & Replace** panel with match case, whole word, regex, replace-one and
  replace-all, plus a live match counter.
- **Word wrap, LF/CRLF toggle, line/column/selection/char count** in the status
  bar, like the real Notepad++.
- **Light & dark themes**, keyboard shortcuts (Ctrl/Cmd+N/O/S/Shift+S/W/F/H,
  Ctrl+Tab to cycle tabs, Alt+1‑9 to jump to a tab).
- Line numbers, bracket matching, auto-closing brackets, code folding, active
  line highlight.

No React/Node build step — it's plain HTML/CSS/JS using CodeMirror 5 from a
CDN, so it deploys as a static site.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 5173
```

## Deploy to Vercel

**Option A — CLI**

```bash
npm i -g vercel
cd scribe
vercel        # preview deploy
vercel --prod # production deploy
```

**Option B — Git + Vercel dashboard**

1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In the [Vercel dashboard](https://vercel.com/new), import the repo.
3. Framework preset: **Other** (static). No build command, no output
   directory override needed — Vercel will serve `index.html` as-is.
4. Deploy.

That's it — there's nothing to configure; `vercel.json` just enables clean
URLs.

## Notes

- The File System Access API (true "save to the same file") only works in
  Chromium-based browsers (Chrome, Edge, Arc, Brave) served over HTTPS or
  localhost. Vercel deployments are HTTPS by default, so this works in
  production. Other browsers automatically fall back to download-based save.
- All content lives in the browser's `localStorage` — nothing is uploaded
  anywhere. Clearing site data will clear unsaved tabs.
