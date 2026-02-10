# ZettelForge

**Your AI-powered atomic note forge for Obsidian.**

ZettelForge helps you transform your literature notes into high-quality atomic notes (Zettels) using AI. Designed for **academic workflows** and the **Zettelkasten methodology**, it automates the creation of **atomic notes** from your **Obsidian** vault. It processes your source notes, generates candidate atomic notes, and provides a streamlined inbox workflow for reviewing, editing, and finalizing them.

> **Note:** This project was primarily built to solve my own personal friction with the time it takes to create atomic notes. However, you are welcome to use it if you find it helpful and adapt it to your own workflow!

## Features

-   **AI-Powered Generation**: Instantly generate multiple atomic note candidates from a single source note.
-   **Inbox Workflow**: Candidates are saved to a dedicated "Inbox" folder for review, ensuring no AI content enters your permanent vault without approval.
-   **Secure Setup**: API keys are stored securely in `localStorage` and never saved to plaintext files or synced.
-   **One-Note Flow**: Select a source note (literature note, daily note, etc.) and generate atomic notes directly from it.
-   **Atomic Principles Embedded**: The AI is prompted with a strict definition of "atomic notes" (Single Responsibility Principle for ideas).
-   **Sequential Review**: Process candidates one by one with a focused UI.
-   **Duplicate Detection**: Early detection of potential duplicate notes to keep your vault clean.
-   **Multi-Provider Support**: Bring your own Key (BYOK) support for:
    -   Google Gemini (Default)
    -   OpenAI
    -   Anthropic Claude
    -   OpenRouter
-   **Customizable Templates**: generated notes include metadata like confidence score, source links, and tags.
-   **Smart Deduplication**:
    -   **Soft Check**: Warns about semantically similar content using Jaccard similarity (scoped to Atomic Notes folder).

## Recommended Workflow

For a complete knowledge management pipeline, tailored for academic and research workflows, it is recommended to use **ZettelForge** alongside its sister project: **[Zotero Triage](https://github.com/hbiaou/zotero-triage)**.

1.  **[Zotero Triage](https://github.com/hbiaou/zotero-triage)**: Handles the creation of high-quality **literature notes** from your Zotero library, ensuring you capture the best source material.
2.  **ZettelForge**: Takes those literature notes and uses AI to distill them into **atomic notes**, ready for your permanent Zettelkasten.

Install both to optimize your workflow from "reading" to "synthesizing".

## Installation

### From Community Plugins (Coming Soon)

This plugin has not yet been submitted to the community plugins list. We will submit it once it has matured enough. In the meantime, please use BRAT, manual installation, or install from a release.

### Manual Installation

1.  Download the latest release from the [Releases](https://github.com/hbiaou/zettelforge/releases) page.
2.  Extract the `main.js`, `manifest.json`, and `styles.css` files into your vault's plugin folder: `<VaultFolder>/.obsidian/plugins/zettelforge/`.
3.  Reload Obsidian.
4.  Enable "ZettelForge" in Community Plugins settings.

### Using BRAT

1.  Install the **BRAT** community plugin in Obsidian.
2.  Open the command palette and run `BRAT: Add a beta plugin for testing`.
3.  Enter the GitHub repository URL: `https://github.com/hbiaou/zettelforge`.
4.  Enable the plugin in Community Plugins settings.

## Setup

1.  Go to **Settings > ZettelForge**.
2.  **Select a Provider**: Choose your preferred AI provider (default is Google).
3.  **Enter API Key**: Enter your API key for the selected provider.
4.  **Configure Folders**:
    -   **Inbox Folder**: Where generated candidates will be placed (Default: `Inbox`).
    -   **Final Folder**: Where finalized atomic notes will be moved (Default: `Zettelkasten`).
    -   *Note: Ensure these folders exist in your vault.*

## Usage

### Generating Notes

1.  Open a source note (e.g., a literature note, article, or book summary).
2.  Open the Command Palette (`Ctrl/Cmd + P`).
3.  Run **`ZettelForge: Generate candidates atomic Notes from current note`**.
4.  The AI will analyze the note and generate atomic note candidates into your configured **Inbox Folder**.

### Reviewing Candidates

1.  Open the Command Palette.
2.  Run **`ZettelForge: Review Inbox candidates`**.
3.  A review modal will open showing the first candidate.
4.  **Actions**:
    -   **Finalize**: Approves the note, moves it to your Final Folder, and updates its status.
    -   **Remove**: Permanently deletes the candidate.
    -   **Cancel**: Closes the view but keeps the note in the Inbox for later.
    -   **Next**: Skips to the next candidate in the Inbox.

## Data Privacy

ZettelForge sends the content of your currently active note to the selected AI provider to generate summaries. No other vault data is sent unless specified. usage is subject to the privacy policy of the AI provider you choose.

## Development

1.  Clone the repository.
2.  Run `npm install`.
3.  Run `npm run dev` to start the watcher.
4.  Copy the built files to your test vault or symlink the folder.

## Author

BIAOU Samadori S. Honoré

## License

Distributed under the MIT License. See `LICENSE` for more information.
