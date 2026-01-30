# Initial Research: Obsidian Plugin Best Practices (2025)

**Date**: 2026-01-30
**Status**: Completed (via Knowledge Retrieval due to browser environment restrictions)

> [!NOTE]
> Automated web search tools encountered a system error (`$HOME` not set). The following findings are based on high-confidence, up-to-date knowledge of the Obsidian API stable as of late 2025.

## 1. Plugin Architecture & API Patterns

### Entry Point
- **Class**: Must extend `Plugin` from `obsidian`.
- **Lifecycle**:
  - `onload()`: Register events, settings, commands, views. Use `this.addCommand`, `this.addSettingTab`.
  - `onunload()`: Clean up intervals or manual DOM events (Obsidian cleans up registered events automatically).

### Safe File Operations (Key for ZettelForge)
- **Reading**: `await this.app.vault.read(file: TFile)`
- **Writing**: `await this.app.vault.modify(file: TFile, data: string)`
- **Creating**: `await this.app.vault.create(path: string, data: string)`
  - *Pitfall*: Fails if file exists. Must check `this.app.vault.getAbstractFileByPath(path)` first.
- **Deleting**: `await this.app.vault.trash(file: TFile, system: boolean)`
  - *Constraint*: **Never** use `delete()` unless specifically intended to bypass trash. ZettelForge spec requires "Remove" behavior, which maps to `vault.trash(file, true)` (system trash) or `false` (Obsidian trash).

### Frontmatter/Metadata
- **Golden Rule**: Use `this.app.fileManager.processFrontMatter(file, (fm) => { ... })`.
  - *Why*: Safe, atomic, reliable. Automatically handles the delimiters.
  - *Avoid*: Manual regex replacements on the raw string.

## 2. Folder Structure (Recommended)

Standard TypeScript (2025) layout:

```text
/
├── main.ts             # Entry point
├── manifest.json       # Plugin metadata
├── package.json        # Dependencies (obsidian, typescript, esbuild)
├── esbuild.config.mjs  # Build script
├── src/
│   ├── settings.ts     # Settings tab & models
│   ├── views/          # UI components (Review Modal)
│   ├── services/       # Core logic (AI, Deduplication)
│   └── utils/          # File ops, formatting helpers
└── .gitignore
```

## 3. Git Initialization & Ignored Files

Standard `.gitignore` for Obsidian plugins:

```gitignore
node_modules/
dist/
main.js
manifest.json       # OPTIONAL: exclude if you build it dynamically, but usually committed
styles.css          # OPTIONAL: exclude if generated
.obsidian/          # NEVER commit the vault config if developing inside a vault
.DS_Store
```

*Note*: If developing *inside* a test vault (common practice), the git root should be the **plugin folder**, not the entire vault.

## 4. Common Pitfalls to Avoid

- **Path Delimiters**: Obsidian paths use forward slashes `/`.
- **Async Metadata**: `metadataCache` is eventually consistent. Do not rely on it immediately after writing a file; use the callback or `modify` return if content is needed.
- **Modals**: For the "Review One-by-One" workflow, a `Modal` is simpler than a `ItemView` (sidebar). A Modal blocks interaction with the rest of the app, which focuses the user on the "Inbox" task.

## 5. ZettelForge Specific Design Notes

Based on M1 requirements:
- **Inbox Workflow**: Use `vault.create` for new candidates.
- **Review UI**: A `Modal` is likely best for the focused "Review" step, or a dedicated `ItemView` if we want it to persist alongside the editor. Given "One-note flow", a Modal is safer to prevent context switching.
- **AI Service**: Keep it purely functional (stateless).
