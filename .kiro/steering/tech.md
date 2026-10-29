# Technology

## Stack
Plain HTML5, CSS3, and vanilla JavaScript (ES2017+). No front-end framework, no npm, no build step.
PHP is available on the host (PHP 5.6–8.x) but is **not used** unless CORS blocks direct browser access to the NHTSA API (see Proxy section below).

## Data source
**Primary endpoint (NHTSA public API — direct browser call):**
```
https://vpic.nhtsa.dot.gov/api/vehicles/GetAllManufacturers?format=json&page={n}
```
- Returns JSON with `Count` (records on this page, max 100) and `Results` array.
- Total pages: 232 (pages 1–232). Page 232 returns 61 records.
- The API does **not** return a total record count; the application treats 232 as the known last page.
- The `Count` field on each response reflects only the current page's record count, not a grand total.

**Fallback proxy endpoint (only if NHTSA blocks browser CORS):**
```
https://pereiravictor.com/traffic/getAllManufacturers.php
```
- Returns the same JSON structure, but only page 1 data (100 records, no page parameter observed).
- Use only as a fallback; document the limitation clearly if it becomes the primary source.

## CORS status
The NHTSA API (`vpic.nhtsa.dot.gov`) is a US government public API. It is expected to serve permissive CORS headers. This must be verified during implementation by testing a `fetch()` call from the deployed origin. If CORS fails, a thin PHP proxy file will be added (see Proxy section).

## Pagination approach
**Server-side pagination driven by the browser.** Each page navigation triggers a new `fetch()` to the NHTSA API with the updated `page` query parameter. No data is accumulated across pages. This avoids loading ~23,000 records at once and keeps memory usage flat.

- Page size: 100 records (fixed by the API).
- Page range: 1–232.
- Current page is tracked in JavaScript state only (no URL hash or query string in v1).

## PHP proxy (conditional)
If the direct NHTSA call is blocked by CORS, a single `proxy.php` file will be added at the project root. It will:
1. Accept a `page` query parameter.
2. Use `file_get_contents()` or `curl` to call the NHTSA API server-side.
3. Return the JSON response with `Content-Type: application/json` and an appropriate CORS header.
Must be compatible with PHP 7.4+ (the safe minimum on MochaHost).

## Hosting and deployment
- Host: MochaHost shared hosting (Apache).
- Deployment path: `public_html/traffic/` (or equivalent public directory).
- No `.htaccess` access on this plan — **do not rely on URL rewriting or custom server rules**.
- Deployment method: FTP/SFTP file upload. No CI/CD pipeline in scope.
- All paths in HTML and JS must be relative so the app works at any subdirectory without configuration.

## Browser support
Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11 support required. ES2017 features (`async/await`, `fetch`) are used freely.
