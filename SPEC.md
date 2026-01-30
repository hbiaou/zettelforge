## Spec — **ZettelForge**

### Milestone 1 goal

From **one selected note** (literature note or any note), generate **candidate atomic notes** using an AI model, save them to an **Inbox folder**, then support **human validation one-by-one** with clear actions: **Keep (review later)**, **Remove (delete)**, **Create/Finalize**.

Key features:

- Candidates are **written immediately** to `Inbox/` (draft state)

- Review is **sequential** (one candidate at a time)

---

# 1) User experience

## 1.1 Commands (Command Palette)

1. **ZettelForge: Generate candidates atomic Notes from current note**
- Reads the currently open note

- Calls the model to produce candidates (JSON)

- Writes each candidate as a draft atomic note into the Inbox folder

- Opens the review workflow on the first candidate
2. **ZettelForge: Review Inbox candidates**
- Opens the “Process Next Candidate” screen

- If multiple exist, it processes one-by-one
3. **ZettelForge: Process next candidate**
- Skips to next remaining draft in Inbox (useful hotkey)

---

# 2) Settings

## 2.1 Provider + API key (BYOK)

- Provider dropdown: OpenAI / Google / Anthropic / OpenRouter

- API key input (masked)

- Optional base URL (OpenRouter/custom)

## 2.2 Model selection (single model)

User selects one model (cheap or reasoning—user’s choice):

- OpenAI: `gpt-5-nano`, `gpt-5-mini`, `gpt-5.2`

- Google: `gemini-2.5-flash-lite`, `gemini-3-flash`, `gemini-3-pro`

- Anthropic: `claude-haiku-4.5`, `claude-sonnet-4.5`

- OpenRouter: free-text model id

## 2.3 Folders

- **Inbox folder** (default: `ZettelForge Inbox/`)

- Final atomic notes folder (default: `Zettels/`)

## 2.4 Dedup & generation

- Similarity threshold (default 0.82)

- Max candidates per run (default 8)

- Default tags (comma-separated)

---

# 3) Data model & templates

## 3.1 Draft candidate note (Inbox) — Markdown template

Candidates are written immediately to Inbox using a **draft** state.

```markdown
---
note_type: atomic-note
status: inbox
note_origin: ai
source_note: [[<SourceNoteName>]]
source_path: <vault-relative-path>
date_created: <YYYY-MM-DD>
date_modified: <YYYY-MM-DD>
model: <provider:model>
confidence: <high|medium|low>
tags: [<tag1>, <tag2>]
---

# <Title>

## Claim
<atomic_claim>

## Support
<support_snippet or "N/A">

## Links
- [[...]]
- [[...]]
```

## 3.3 Finalized atomic note template (output)

When user finalizes a candidate, it is moved (or rewritten) to the final folder and marked as finalized:

```markdown
---
note_type: atomic-note
status: final
note_origin: <ai|human>
source_note: [[<SourceNoteName>]]
source_path: <vault-relative-path>
date_created: <YYYY-MM-DD>
date_modified: <YYYY-MM-DD>
tags: [<tag1>, <tag2>]
---

# <Title>

## Claim
<atomic_claim>

## Support
<support_snippet or "N/A">

## Links
- [[...]]
- [[...]]
```

Rules:

- `date_created` stays the original candidate creation date

- `date_modified` updates whenever the note is edited/finalized

- If user rewrites substantially and wants credit as human: set `note_origin: human` (UI toggle)

---

# 4) Workflow / Steps (Inbox-first, one-by-one review)

## Step 0 — Preconditions

- Must have an open markdown note

- If too short (< ~300 chars), warn and stop

## Step 1 — Read source note + build evidence map

- Read full markdown content + frontmatter

- Build heading→chunk map for extracting support snippets

## Step 2 — Early dedup & linking context (vault scan)

Before AI call:

- Identify existing potential related atomic notes:
  
  - title keyword match
  
  - tag overlap
  
  - existing links in source note

- Build a minimal context payload: titles + brief claim/first paragraph

## Step 3 — AI generation (single call)

Model receives:

- source note markdown

- related notes context (minimal)

- strict JSON schema  
  Model returns:

- up to K atomic note candidates

## Step 4 — Dedup scoring (post-AI)

For each candidate:

- compare against likely matches found in Step 2

- mark:
  
  - `duplicate: true/false`
  
  - `similar_notes: top 3`  
    Default UI state:

- duplicates default to “Remove” (but user can keep)

## Step 5 — Write candidates to Inbox (immediate persistence)

Write each candidate as a draft note into **Inbox folder** with:

- `status: inbox`

- `note_origin: ai`

- populated sections

- include “similar notes” info in a callout block in the body (recommended for human review)

Recommended callout (optional):

```markdown
> [!warning] Possible duplicates
> - [[Note A]] (0.89)
> - [[Note B]] (0.85)
```

## Step 6 — Human validation (one-by-one processing)

Open a “Process Candidate” view for the first Inbox note.

### Global controls

- **Finalize**: moves note to Final folder + sets `status: final` + updates `date_modified`

- **Remove**: deletes the candidate note permanently

- **Cancel**: closes UI and **keeps the note in Inbox (to review later)**

- **Next**: go to next Inbox candidate (without changing current note)

- **Open note**: open candidate in editor for manual edits

Clarified semantics:

- **Cancel = keep in Inbox**

- **Remove = delete permanently** (Obsidian “delete” action; no recycle behavior guaranteed)

---

# 5) UI (Process Candidate screen)

Displays ONE candidate note at a time:

- Title (editable)

- Claim (editable)

- Support (read-only or editable—your choice; default editable)

- Links (editable)

- Duplicate warning callout + links

- Toggle: `note_origin` = ai/human (default ai)

Buttons:

- Finalize

- Remove (delete)

- Cancel (keep in Inbox)

- Next

---

# 6) Acceptance criteria (DoD)

### Functional

- Generates candidates from one note

- Writes candidates to Inbox immediately

- Processes candidates sequentially

- Cancel leaves candidate in Inbox

- Remove deletes candidate permanently

- Finalize moves to final folder + updates metadata

### Safety/quality

- If model output invalid JSON: show error and write nothing

- No modification to source literature note

- No hallucinated support: if missing → “N/A”

---

# 7) Deferred to Milestone 2

- Embeddings-based dedup and auto-linking

- Better “similar notes” search across whole vault

- Optional PDF citation/page extraction integration

- Multi-pass refinement (extract → rewrite → normalize → link)
