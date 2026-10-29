# Project structure

## File layout
```
kiro_traffic/
├── index.html          # Single HTML page — app shell, table markup, pagination controls
├── css/
│   └── style.css       # All styles: layout, table, pagination, loading/error states
├── js/
│   └── app.js          # All JavaScript: fetch logic, DOM rendering, pagination state
└── proxy.php           # OPTIONAL — only added if NHTSA CORS blocks direct browser access
```

No subdirectories beyond `css/` and `js/`. No external CSS frameworks. No external JS libraries.

## Conventions

### HTML (`index.html`)
- Single `<main>` landmark containing the table and pagination controls.
- Table uses `<thead>` / `<tbody>` with semantic column headers.
- Pagination controls are a `<nav>` with Previous / Next buttons and a page-count label.
- A `<div id="status">` element is used to display loading and error messages.
- All paths to CSS and JS are relative (`css/style.css`, `js/app.js`).

### CSS (`css/style.css`)
- No external fonts or icon libraries.
- Mobile-first responsive design: the table collapses gracefully on narrow viewports.
- Class naming: plain, descriptive, no BEM or utility-first convention.
- Key selectors: `table`, `.pagination`, `.status`, `.loading`, `.error`.

### JavaScript (`js/app.js`)
- One IIFE or ES module structure — no global variable pollution.
- Single `state` object tracking `{ currentPage, totalPages }`.
- Functions: `fetchPage(page)`, `renderTable(results)`, `renderPagination()`, `showStatus(msg, isError)`.
- No third-party libraries. Uses native `fetch()` and `async/await`.
- The API base URL and total pages constant (`TOTAL_PAGES = 232`) are defined at the top of the file for easy maintenance.

### PHP proxy (`proxy.php`, conditional)
- Single file, fewer than 30 lines.
- Validates the `page` parameter (integer, 1–232) before forwarding.
- Returns JSON with `Content-Type: application/json` header.
- No framework, no Composer dependencies.

## What is not in this repository
- No `node_modules`, `package.json`, or any npm tooling.
- No test files in v1.
- No environment configuration files (no `.env`).
- No build artifacts or minified files — source files are deployed directly.
