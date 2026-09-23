# Novera

A fast, local-first workspace built with plain HTML, CSS and JavaScript, with no build step.

## Run

Open `index.html` directly in a modern browser, or serve the folder:

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## Included

- Notion-style sidebar and page editor
- Nested pages, favorites and Home view
- Block editor: text, Page, Link to page, Link, H1/H2/H3, bullets, numbers, todos, toggles, quote, callout, code, divider, Image, Table, Columns and Database
- Slash commands
- Drag/drop block reordering
- Simple Table block with editable cells, header row/column toggles, row/column add/remove and keyboard Tab navigation
- Columns block with 2–4 columns, nested blocks, slash commands inside columns, and drag/drop between columns
- Inline Database block
- Command palette (`Ctrl/Cmd + K`)
- Notion-style `/Link to page` block for referencing existing pages without changing their hierarchy; page references feed backlinks
- Interactive Graph View rendered as a normal editor tab, with page nodes, link edges, search, zoom, and node navigation
- IndexedDB persistence for local-first workspace data
- Light/dark/system themes (`Ctrl/Cmd + Shift + L`)
- JSON workspace import/export
- Responsive layout
- Share/settings dialogs (local UI demo)

## Notes

This is a local-first front-end clone/prototype. Real multi-user collaboration, authentication, server persistence, file uploads, comments, permissions, sync, AI, notifications, and production-grade databases require a backend/service layer.


## Standalone build

`index.html` now embeds all CSS and JavaScript, so it can be opened directly without a web server and without loading `styles.css` or `app.js` separately.

- VS Code-style page tabs: persistent open tabs, drag-to-reorder, close, middle-click close, Ctrl/Cmd+W and Ctrl/Cmd+Tab navigation.

- VS Code-style tabs: left-click a page to reuse the active tab, middle-click a page to open a new tab, drag to reorder, middle-click a tab to close.

- Page block: create real nested subpages from the slash menu, with normal click navigation and middle-click new-tab navigation.


## Vaults

The left sidebar footer includes a vault selector. Multiple local vaults are supported, each with independent pages, tabs, favorites, and layout state. You can create, rename, switch, and delete vaults. Vault data is persisted exclusively in IndexedDB (`novera-local-workspace`). No LocalStorage compatibility or legacy-data migration layer is maintained.


## Recent editor features

- Expanded page icon emoji catalog.
- Inline emoji picker: type `:` in a text block, optionally continue with a name such as `:fire`, then use arrow keys + Enter or click an emoji.
- Unified editor/sidebar scrollbar styling.
- Contextual inline formatting toolbar for selected text, including block type, colors, bold/italic/underline/strike, inline code, comments, and links.
- Inline Link picker can search existing Novera pages or attach an external URL; internal inline links participate in backlinks and Graph View.


## Table and Columns

- `/table` inserts a lightweight editable table, separate from the database block.
- `/columns` inserts a two-column layout; switch between 2, 3 and 4 columns from the block control.
- Blocks inside columns retain normal editing, slash commands, block menus and drag/drop behavior.
- Reducing the number of columns moves content from removed columns into the last remaining column instead of deleting it.
## Undo / Redo

The editor keeps an in-memory undo history per vault (up to 100 checkpoints). Continuous typing is grouped into one undo step after a short pause, while structural actions such as adding/removing/moving blocks, changing tables/columns, pages, icons, favorites and tabs create their own checkpoints.

Shortcuts: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo, and `Ctrl+Y` redo on Windows-style keyboards. The top note toolbar also includes Undo/Redo buttons. History is intentionally not persisted across full page reloads.



## Links

- `/link` inserts a compact hyperlink block with editable label and URL.
- URLs without a scheme are normalized to HTTPS when confirmed.
- Supported protocols are HTTP, HTTPS, `mailto:` and `tel:`.
- Use the ↗ action or `Ctrl/Cmd+Enter` while editing the block to open a valid link in a new tab.
- Link blocks can be nested inside Columns and participate in normal drag/drop, duplicate, delete and undo/redo flows.

## Sidebar overflow

The Files/Favorites sidebar keeps vertical overflow disabled unless its current content is actually taller than the available panel. Overflow is recalculated after panel switches, sidebar open/close and window resize.

- Searchable, scrollable page icon picker with external SVG/PNG/JPG/WEBP/GIF/ICO support.

- Mermaid code language with syntax highlighting and live diagram preview. Mermaid 12 is loaded on demand from jsDelivr when a diagram preview is shown.
- Code blocks now follow the active light/dark theme, including syntax colors, toolbar, line numbers and Mermaid preview.
- Paste Markdown into text-like blocks and Novera converts headings, lists, tasks, quotes, callouts, dividers, fenced code, tables, links and images into native blocks.

## Source layout

- `index.html` — standalone build with CSS and JavaScript embedded.
- `styles.css` — modular stylesheet source.
- `app.js` — modular JavaScript source.
- `README.md` — project documentation.

The repository is kept in sync with the complete current source after each finished code change.

## Page title behavior

Pressing `Enter` while editing a page title inserts a new empty text block at the beginning of the page and focuses it. Existing page content is pushed down one block.
