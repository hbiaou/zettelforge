# Project Scaffolding Plan (Milestone 1)

**Status**: Proposed
**Date**: 2026-01-30

Based on `SPEC.md` and `reports/2026-01-30_initial_research.md`, here is the minimal folder structure proposed for Milestone 1.

## Proposed Folder Structure

```text
/
├── .gitignore               # Standard Obsidian/Node ignore patterns
├── manifest.json            # Plugin ID: "zettelforge", minAppVersion: "1.0.0"
├── package.json             # Deps: obsidian, typescript, esbuild
├── esbuild.config.mjs       # Standard Obsidian build script
├── AGENT.md                 # (Existing) Rules
├── SPEC.md                  # (Existing) Requirements
├── templates/               # (Existing)
│   ├── Draft candidate note.md
│   └── Finalized atomic note.md
├── reports/                 # (Existing) Research & Progress reports
└── src/
    ├── main.ts              # Entry point: Load plugin, register commands/settings
    ├── config.ts            # Constants (DEFAULT_SETTINGS, folder paths)
    ├── settings/
    │   └── tab.ts           # SettingsTab implementation
    ├── ui/
    │   └── review-modal.ts  # The "One-by-One" review UI (Modal)
    ├── services/
    │   ├── ai.ts            # LLM Client (OpenAI/Anthropic/Google/OpenRouter)
    │   └── dedup.ts         # Heuristic scoring (tags/keywords)
    ├── notes/
    │   └── note-ops.ts      # "Safe" file ops: createInInbox, finalize, delete
    └── utils/
        └── frontmatter.ts   # Safe wrappers for processFrontMatter
```

## Rationale

1.  **`src/notes/note-ops.ts`**: Centralizes all `vault.create` (Inbox) and `vault.trash` (Remove) logic to ensure safety and consistent error handling (as per AGENT.md Rule 9).
2.  **`src/ui/review-modal.ts`**: Uses a `Modal` class to enforce the "one-by-one" blocking review flow required by SPEC.md Section 6. A Modal prevents users from distracted editing while processing the Inbox.
3.  **`src/services/ai.ts`**: Encapsulates the BYOK logic so we can swap providers easily without touching the UI.
4.  **`src/utils/frontmatter.ts`**: Dedicated place for the "Safe Metadata" logic (`fileManager.processFrontMatter`) identified in Phase 1 research.
