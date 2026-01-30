# ZettelForge Development Rules

> Purpose: This file defines the **non-negotiable rules** for developing the **ZettelForge** Obsidian plugin.
> It is intentionally concise and uses **progressive disclosure**: follow the “Quick Rules” always; expand only the section you need.

---

## 0) Quick Rules (always follow)

1. **Web Search First (Hard Rule)**  
   Before writing or modifying any code, perform a web search to confirm **current**:
   
   - Obsidian plugin API patterns (manifest, entrypoint, settings UI, file ops)
   - LLM provider SDK usage (OpenAI/Google/Anthropic/OpenRouter)
   - Any library APIs you plan to use (similarity, parsing, etc.)
     Document findings briefly in `/reports/` with citations.

2. **Progressive Disclosure**  
   Do not read or modify the whole repo by default.  
   Start with the minimum files needed; expand only when blocked.

3. **One-note flow only (Milestone 1 constraint)**  
   The plugin processes **one source note at a time** and generates candidate atomic notes into an **Inbox** folder.  
   Human validation is **one-by-one**.

4. **No hallucinations / Evidence discipline**  
   The AI must not invent content. If support is missing, write `N/A`.

5. **No silent destructive actions**  
   
   - **Cancel** keeps candidate in Inbox  
   - **Remove** deletes candidate permanently  
   - **Finalize** moves candidate to final folder and updates metadata  
     Any delete action must be explicit in the UI.

6. **Small commits, testable steps**  
   Each change must be small enough to verify quickly in Obsidian.

---

## 1) Deliverable for Milestone 1

ZettelForge must provide:

- Command: **Generate candidates from current note**
- Candidates saved immediately to **Inbox folder**
- Command/UI: **Review Inbox candidates** (process **one** at a time)
- Controls: **Finalize**, **Remove (delete)**, **Cancel (keep in Inbox)**, **Next**
- BYOK: Provider + API key + **single model selector**
- Early de-dup: mark likely duplicates and suggest links
- Atomic note template includes:
  - `date_created`, `date_modified`
  - `note_origin: ai|human` (avoid author/creator)

---

## 2) Project Operating Mode

### 2.1 Mandatory work loop

For every feature or bugfix, follow this loop:

1) **Search →** confirm best practices + current APIs  
2) **Plan →** write a short implementation plan (bullet points)  
3) **Implement →** minimal code change  
4) **Validate →** manual test in Obsidian (and automated checks if present)  
5) **Report →** update `/reports/` with what changed and how validated

### 2.2 Reports (required)

Create (or update) a short markdown report per work session:

- Path: `/reports/YYYY-MM-DD_<topic>.md`
- Contents:
  - What you searched (queries)
  - Key findings (with links/citations)
  - What you changed (files)
  - How you tested (steps + results)

---

## 3) Repo Navigation (progressive disclosure)

### 3.1 Start here (minimal)

Only open these first:

- `manifest.json`
- `package.json`
- main entry file (e.g., `main.ts`)
- settings file/module (if present)

### 3.2 Expand only if needed

- UI modules (modal/view)
- services (AI client, dedup)
- utilities (markdown/frontmatter parsing)

---

## 4) Architecture Requirements (Milestone 1)

### 4.1 Modules (recommended split)

- `services/ai.ts`  
  Provider adapters (OpenAI / Google / Anthropic / OpenRouter) with a single `generateCandidates()` API.
- `services/dedup.ts`  
  Early similarity scan + scoring.
- `ui/review-modal.ts`  
  One-by-one review **Modal** (not ItemView) to enforce focus and prevent context switching.
- `notes/note-ops.ts`  
  Centralized safe vault operations: `createInInbox`, `finalize`, `trash`.
- `utils/frontmatter.ts`
  Wrapper for `fileManager.processFrontMatter` to ensure safe metadata updates.
- `settings/tab.ts`  
  Settings UI + persistence.

**Rule:** Providers must be swappable without touching UI code.
**Rule:** All file creation/deletion must go through `note-ops.ts`.

### 4.2 Data contracts (must be explicit)

- Candidate JSON schema returned by the model (strict)
- Atomic note markdown template (Inbox vs Final)
- Actions semantics:
  - Cancel: keep in Inbox
  - Remove: delete permanently
  - Finalize: move to final folder + set `status: final` + update `date_modified`

---

## 5) AI Service Layer (BYOK) Rules

### 5.1 Single model selection

User chooses provider + model; there is **no** cheap/reasoning split.

### 5.2 Provider support requirements

- Settings must store:
  - provider
  - apiKey
  - modelId
  - (optional) baseUrl (OpenRouter/custom)

### 5.3 Prompting rules

- Require **strict JSON output** (no prose)
- Include:
  - source note markdown
  - minimal related-note context (titles + small snippets)
  - max candidates K
- Enforce:
  - one idea per note
  - support snippet verbatim or `N/A`
  - suggested wikilinks
  - confidence `high|medium|low`

### 5.4 Fail-safe behavior

If JSON parsing fails:

- show error
- do **not** write candidates
- allow retry

---

## 6) De-dup & Linking Rules (Milestone 1)

### 6.1 When it happens

De-dup happens **early**:

1) Before AI call: gather likely related notes (keyword/tag/link heuristics)
2) After AI call: score candidates vs related notes and flag duplicates

### 6.2 Output behavior

- Candidates flagged as duplicates must show:
  
  - top 3 similar notes
  - similarity scores

- Default UI action for duplicates: **Skip/Next** (do not auto-delete)
  
  ---
  
  ## 7) Note Writing Rules
  
  ### 7.1 Inbox notes
  
  - Write immediately to Inbox folder
  - Must include:
    - `status: inbox`
    - `note_origin: ai`
    - `date_created`, `date_modified` (same at creation)
    - `source_note`, `source_path`
    - `model` used
  
  ### 7.2 Finalize
  
  - Move/rename file into final folder
  - Update:
    - `status: final`
    - `date_modified` = today
  - Preserve:
    - `date_created`
  - Allow user to set `note_origin` to `human` if they substantially rewrite
  
  ### 7.3 Remove
  
  - Delete file permanently (explicit action)
  - Never delete without user click
  
  ---
  
  ## 8) Testing & Validation (Milestone 1)
  
  ### 8.1 Minimum manual test checklist
  
  - Generate candidates from a note with:
    - headings
    - links
    - tags
  - Verify files written to Inbox correctly
  - Open review flow:
    - Next works
    - Cancel keeps file
    - Remove deletes file
    - Finalize moves file and updates frontmatter
  
  ### 8.2 Regression checks (quick)
  
  - Settings persist after reload
  - No crashes when:
    - note is short
    - no frontmatter
    - empty tags
    - no related notes found
  - AI failure path doesn’t write files
  
  ---
  
  ## 9) Coding Standards
  
  - Prefer small, composable functions
  - Centralize all vault file operations in one module
  - Never block UI on long work without feedback
  - Log errors to console with clear prefixes: `[ZettelForge]`
  
  ---
  
  ## 10) When uncertain (decision policy)
  
  1) Search the web for the latest best practice/API info  
  2) Prefer the simplest implementation that meets M1 requirements  
  3) Document tradeoffs in `/reports/`
  
  ---
  
  ## Appendix A — Default folders & fields (M1)
  
  - Inbox folder: `ZettelForge Inbox/`
  - Final folder: `Zettels/`
  - Frontmatter fields:
    - `note_type: atomic-note`
    - `status: inbox|final`
    - `note_origin: ai|human`
    - `date_created: YYYY-MM-DD`
    - `date_modified: YYYY-MM-DD`
    - `source_note: [[...]]`
    - `source_path: ...`
    - `model: provider:modelId`
    - `confidence: high|medium|low`
    - `tags: [...]`
