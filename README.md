# 📝 Scribe — Web Code & Text Editor

A fast, lightweight, multi-tab text and code editor for the browser, inspired by Notepad++ and VS Code. Built with pure HTML, CSS, and Vanilla JavaScript with CodeMirror, running 100% client-side with zero build steps or server dependencies.

---

## ✨ Features

### 📑 Tab & Workspace Management
- **Multi-Tab Interface**: Open, edit, and organize multiple documents in independent tabs.
- **Session Persistence**: Open tabs, editor content, dirty states, and cursor positions survive page reloads automatically via `localStorage`.
- **Unsaved Changes Tracking**: Visual dot indicators for modified files and confirmation prompts before closing unsaved work.
- **Tab Cycling & Navigation**: Switch tabs with mouse clicks, `Ctrl+Tab` / `Ctrl+Shift+Tab`, or direct index shortcuts (`Alt+1` through `Alt+9`).

### 💻 Code Editing & Syntax Highlighting
- **25+ Language Modes**: Auto-detected by file extension or selectable on-the-fly:
  - **Web**: JavaScript, TypeScript, JSX, HTML, CSS, XML, JSON, Markdown
  - **Systems & Backend**: Python, C, C++, C#, Java, Go, Rust, PHP, Ruby, Swift
  - **DevOps & Scripting**: Shell / Bash, PowerShell, Dockerfile, YAML, TOML, SQL, Lua, Perl, Plain Text
- **Code Folding**: Fold/unfold code blocks, braces, indentation, and comments with gutter markers.
- **Smart Indentation & Brackets**: Auto-closing brackets/quotes, bracket matching, and configurable tab/space indentation.
- **Active Line & Selection Stats**: Real-time cursor line/column indicators, character counts, and selection length.

### 🔍 Search & Replace
- **Floating Find Bar** (`Ctrl+F`): Fast search with real-time match highlighting and match counters (`X of Y`).
- **Replace Engine** (`Ctrl+H`): Replace individual matches or execute **Replace All** across the entire document.
- **Search Filters**: Case-sensitive matching (`Aa`), Whole Word matching (`"ab"`), and Regular Expressions (`.*`).

### 📁 File I/O & System Integration
- **Native File System Access API**: Open files from disk and save directly back to the original file (Chromium browsers over HTTPS/localhost).
- **Universal Fallback**: Automatic download/prompt fallback for Firefox, Safari, or older browsers.
- **Drag & Drop**: Drag files directly from your desktop or file manager into the editor window to open in a new tab.
- **Line Ending & Encoding**: Toggle between `LF` and `CRLF` endings; support for UTF-8 documents.
- **Word Wrap Toggle**: One-click wrap toggle from the status bar or settings.

### 🎨 Design & Themes
- **Modern Dark & Light Themes**: Carefully curated palettes with high-contrast syntax highlighting.
- **Custom Typography**: JetBrains Mono for code and Inter for UI elements.
- **Responsive Layout**: Adapts cleanly to desktops, laptops, and mobile screens.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | New Tab |
| `Ctrl + O` | Open File |
| `Ctrl + S` | Save File |
| `Ctrl + Shift + S` | Save File As... |
| `Ctrl + W` | Close Active Tab |
| `Ctrl + F` | Find |
| `Ctrl + H` | Find & Replace |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + Tab` | Next Tab |
| `Ctrl + Shift + Tab` | Previous Tab |
| `Alt + 1` ... `Alt + 9` | Jump to Tab 1–9 |
| `Escape` | Close Find Bar / Modals |

> *On macOS, use `Cmd` in place of `Ctrl`.*

---

## 🚀 Getting Started

### Run Locally

Because Scribe is a zero-dependency static web application, no build steps (`npm run build`) are required.

1. **Direct Browser Open**:
   Simply double-click [`index.html`](index.html) or drag it into any web browser.

2. **Local HTTP Server** (Recommended for File System Access API):
   ```bash
   # Using Python
   python -m http.server 3000

   # Using Node.js (npx)
   npx serve .
   ```
   Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment

### Deploy to Vercel

Scribe includes a [`vercel.json`](vercel.json) configuration for instant deployment:

#### Method 1: Via GitHub / Vercel Dashboard
1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Framework Preset: **Other**.
4. Click **Deploy**.

#### Method 2: Via Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## 🔒 Privacy & Security

- **100% Client-Side**: All editing, saving, and persistence happens entirely in your local browser.
- **Zero Telemetry**: No tracking scripts, analytics, or external server uploads.
- **Data Persistence**: Data is saved strictly in your browser's private `localStorage`.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
