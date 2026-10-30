# Requirements Document

## Introduction

The Manufacturers Browser is a single-screen web application that allows users to browse vehicle manufacturers registered with the National Highway Traffic Safety Administration (NHTSA). The application fetches data on demand from the NHTSA public Vehicle Information API (`https://vpic.nhtsa.dot.gov/api/`), displaying up to 100 records per page in a responsive table. Users navigate forward and backward through pages using Previous and Next controls. No authentication, search, filtering, or sorting is included in this version.

The API does not return a total page count. Boundary detection is done by observing the response: a page returning fewer than 100 records is the last page; a page returning zero records means the requested page is beyond the last page. The App always shows "Page N" and never presents an unverified total to the user.

## Glossary

- **App**: The single-page web application described in this document (`index.html`, `css/style.css`, `js/app.js`).
- **API**: The NHTSA vPIC public endpoint `https://vpic.nhtsa.dot.gov/api/vehicles/GetAllManufacturers?format=json&page={n}`. Documented at `https://vpic.nhtsa.dot.gov/api/`.
- **Proxy**: The optional PHP file (`proxy.php`) that forwards API requests server-side when the browser cannot reach the API directly due to CORS restrictions.
- **Manufacturer Record**: A single JSON object in the `Results` array, containing `Mfr_ID`, `Mfr_Name`, `Mfr_CommonName` (may be null), `Country` (may be null), and `VehicleTypes` (array, may be empty).
- **Display Name**: The value shown in the Name column. Equals `Mfr_CommonName` when non-null and non-empty; otherwise equals `Mfr_Name`.
- **Vehicle Types String**: The comma-separated list of `Name` values from the `VehicleTypes` array. Empty string when the array is empty.
- **Current Page**: The 1-based page number of the most recently *successfully loaded* Page Response. Initialized to `0` before any page has been loaded. Updated to the page number on first successful load and on every subsequent successful page load. Does not change while a fetch is in flight, after a failed fetch, or after an empty-probe response. Set to `0` when the dataset is confirmed empty.
- **Requested Page**: The 1-based page number the App is currently fetching or is about to fetch. Equals Current Page when idle. Set to the target page number when a navigation or retry action is initiated. On success, Current Page advances to match Requested Page. On failure, Requested Page reverts to Current Page (after recording the failed value in Failed Page).
- **Failed Page**: The value of Requested Page captured at the moment a fetch fails. Set on any failure: network error, non-2xx status, malformed JSON, or timeout. Used exclusively by the Retry action to re-fetch the page that failed. Cleared when a retry succeeds.
- **Last Page Known**: A boolean flag. Initially `false`. Set to `true` when boundary detection confirms the last page (Requirement 5, Criteria 1 or 2). Once `true`, it remains `true` for the session unless a subsequent full-page response suggests the dataset has grown (Requirement 5, Criterion 4).
- **Last Confirmed Page**: The page number confirmed as the last page. Only meaningful when Last Page Known is `true`. Set by Requirement 5, Criteria 1 and 2. Updated if boundary detection fires again.
- **Page Response**: The JSON object returned by the API for a given page request, containing `Count` (integer, number of records returned), `Message` (string), `SearchCriteria` (null for this endpoint), and `Results` (array of Manufacturer Records).
- **Full Page**: A Page Response where `Count` equals 100. Indicates the dataset continues beyond this page.
- **Partial Page**: A Page Response where `Count` is between 1 and 99 inclusive. Confirms this page is the last.
- **Empty Response**: A Page Response where `Count` equals 0 and `Results` is empty. When Requested Page is greater than 1, this means the probe went past the last page. When Requested Page equals 1, the dataset is empty.
- **REQUEST_TIMEOUT_MS**: A named constant in `app.js`. Default: 10 000 milliseconds. Applied to every fetch.
- **Loading State**: The UI state while a fetch is in flight.
- **Error State**: The UI state after a fetch fails.

## API Behaviour (Verified)

The following facts were verified by direct inspection of the API at `https://vpic.nhtsa.dot.gov/api/`:

- **Endpoint**: `GET https://vpic.nhtsa.dot.gov/api/vehicles/GetAllManufacturers?format=json&page={n}`
- **Page size**: always 100 records per page; fixed by the API, not configurable.
- **Response fields**: `Count` (records on this page), `Message`, `SearchCriteria` (always null for this call), `Results` (array).
- **No total count**: the API returns no field indicating total records or total pages.
- **Boundary signal**: a page beyond the last page returns `{"Count":0,"Results":[]}`. A page at the last page returns fewer than 100 records.
- **Rate limiting**: the API states automated traffic rate control is applied. Rapid sequential requests may be throttled.
- **CORS**: not verified from a browser origin. See Assumption A1.

## Unresolved Assumptions

**A1 — Browser CORS access**
The NHTSA API is a US government public endpoint expected to serve permissive CORS headers, but this has not been verified from the deployed browser origin. If the browser is blocked, the App cannot fetch data without the Proxy.
*Resolution*: Before the feature is considered complete, perform a manual `fetch()` test from the deployed production origin. If CORS is confirmed, `USE_PROXY` stays `false` and `proxy.php` is not deployed. If CORS fails, deploy `proxy.php` (updating it to support a `page` parameter per Assumption A3), set `USE_PROXY = true` in `app.js`, and verify end-to-end operation through the proxy. The CORS result must be documented in a comment at the top of `app.js`. The feature MUST NOT be declared complete until this decision is resolved and, if the proxy is required, until the proxy is verified working.

**A2 — Empty response as boundary signal**
The App relies on an empty Page Response (Count 0) to detect that the previous page was the last page. This assumes the API never returns an empty response for a valid mid-dataset page. If the API skips records and creates an empty page between populated pages, the App would incorrectly treat the previous page as the last.
*Resolution*: Treat this as an accepted risk given the observed API behaviour. Document the assumption. If a future version needs to handle sparse datasets, a look-ahead probe would be required.

**A3 — Proxy page parameter support**
The existing proxy URL (`pereiravictor.com/traffic/getAllManufacturers.php`) returns only page-1 data and does not accept a `page` parameter. If CORS fails and this Proxy becomes the data source, pagination beyond page 1 is not possible without modifying or replacing the Proxy.
*Resolution*: If CORS fails, the Proxy must be updated to accept and forward a `page` query parameter before the App can be considered fully functional. The requirements below assume the Proxy, if used, supports the `page` parameter.

---

## Requirements

### Requirement 1: Initial Page Load

**User Story:** As a user, I want the application to automatically load the first page of manufacturers when I open it, so that I see data immediately without taking any action.

#### Acceptance Criteria

1. WHEN the App is opened in a browser, THE App SHALL set Requested Page to 1 and fetch that page from the API automatically, without requiring user interaction.
2. WHILE the initial fetch is in progress, THE App SHALL display a loading indicator in the status area, show the pagination label as "Loading…", leave the table empty, and disable both the Previous and Next buttons.
3. WHEN the initial fetch returns a Full Page Response, THE App SHALL render all 100 Manufacturer Records in the table, set Current Page to 1, set the pagination label to "Page 1", remove the loading indicator, disable the Previous button, and enable the Next button.
4. WHEN the initial fetch returns a Partial Page Response, THE App SHALL render all returned Manufacturer Records in the table, set Current Page to 1, set the pagination label to "Page 1", remove the loading indicator, disable the Previous button, disable the Next button, and apply the boundary rules in Requirement 5, Criterion 1.
5. IF the initial fetch returns an error response, fails, or produces no response within REQUEST_TIMEOUT_MS, THEN THE App SHALL remove the loading indicator, leave both the Previous and Next buttons disabled, set the pagination label to "Page 1" (the attempted page), record Failed Page as 1, and display an error message and a Retry button. Current Page SHALL remain 0 because no page has been successfully loaded.

---

### Requirement 2: Table Display

**User Story:** As a user, I want each manufacturer displayed in a clearly labelled table row, so that I can read manufacturer names, countries, and vehicle types at a glance.

#### Acceptance Criteria

1. THE App SHALL render a table with exactly three visible columns in left-to-right order: Name, Country, and Vehicle Types.
2. WHEN a Manufacturer Record has a non-null and non-empty `Mfr_CommonName`, THE App SHALL display `Mfr_CommonName` as the Display Name in the Name column.
3. WHEN a Manufacturer Record has a null or empty `Mfr_CommonName`, THE App SHALL display `Mfr_Name` as the Display Name in the Name column.
4. WHEN a Manufacturer Record has a non-empty `VehicleTypes` array, THE App SHALL display the Vehicle Types String (type names joined by `", "`) in the Vehicle Types column.
5. WHEN a Manufacturer Record has an empty `VehicleTypes` array, THE App SHALL display an empty string in the Vehicle Types column.
6. WHEN a Manufacturer Record has a null or empty `Country` field, THE App SHALL display an empty string in the Country column.
7. THE App SHALL render one table row per Manufacturer Record in the order returned by the API.

---

### Requirement 3: Next Page Navigation

**User Story:** As a user, I want to advance to the next page of manufacturers, so that I can browse records beyond the first page.

#### Acceptance Criteria

1. WHEN the Next button is enabled and the user activates it, THE App SHALL set Requested Page to Current Page plus 1 and fetch that page from the API.
2. WHEN the fetch returns a successful Page Response (Full or Partial), THE App SHALL replace the table contents with the new Manufacturer Records, set Current Page to Requested Page, and update the pagination label to "Page N" where N is the new Current Page.
3. WHEN the fetch returns a Full Page Response, THE App SHALL keep the Next button enabled after the fetch completes.
4. WHEN the fetch returns a Partial Page Response, THE App SHALL apply the boundary rules in Requirement 5, Criterion 1 after the fetch completes.
5. WHILE a fetch is in flight, THE App SHALL disable both the Previous and Next buttons.
6. IF the fetch returns an error response, fails, or produces no response within REQUEST_TIMEOUT_MS, THEN THE App SHALL record the value of Requested Page as Failed Page, revert Requested Page to Current Page, keep the table showing the last successfully loaded results, and display an error message and Retry button.

---

### Requirement 4: Previous Page Navigation

**User Story:** As a user, I want to go back to the previous page of manufacturers, so that I can review records I have already seen.

#### Acceptance Criteria

1. WHEN the Previous button is enabled and the user activates it, THE App SHALL set Requested Page to Current Page minus 1 and fetch that page from the API.
2. WHEN the fetch returns a successful Page Response, THE App SHALL replace the table contents with the new Manufacturer Records, set Current Page to Requested Page, and update the pagination label to "Page N" where N is the new Current Page.
3. WHILE a fetch is in flight, THE App SHALL disable both the Previous and Next buttons.
4. IF the fetch returns an error response, fails, or produces no response within REQUEST_TIMEOUT_MS, THEN THE App SHALL record the value of Requested Page as Failed Page, revert Requested Page to Current Page, keep the table showing the last successfully loaded results, and display an error message and Retry button.

---

### Requirement 5: Boundary Detection

**User Story:** As a user, I want the application to correctly identify the last page of data, so that the Next button is never enabled when no further pages exist.

#### Acceptance Criteria

1. WHEN a Page Response is a Partial Page (Count between 1 and 99), THE App SHALL set Last Page Known to `true`, set Last Confirmed Page to the current Requested Page, and disable the Next button. This applies on any page, including page 1.
2. WHEN a Page Response is an Empty Response and Requested Page is greater than 1, THE App SHALL set Last Page Known to `true`, set Last Confirmed Page to Requested Page minus 1, revert Requested Page to Current Page, keep the table showing the last successfully loaded results, keep the pagination label showing "Page N" for Current Page, and disable the Next button. This is a probe result; it is not a successful page load.
3. WHEN a Page Response is an Empty Response and Requested Page equals 1, THE App SHALL set Last Page Known to `true`, set Last Confirmed Page to 0, set Current Page to 0, leave the table empty, disable both buttons, and display a non-error informational message indicating the dataset is currently empty.
4. WHEN a Page Response is a Full Page (Count equals 100) AND `requestedPage` is greater than or equal to `lastConfirmedPage`, THE App SHALL set Last Page Known to `false` and clear Last Confirmed Page, because a full-page result at or beyond the previously confirmed boundary indicates the dataset may have grown. A full-page result for a page that is strictly less than Last Confirmed Page does NOT reset the boundary.

---

### Requirement 6: Navigation Button State

**User Story:** As a user, I want the navigation buttons to always reflect a consistent and predictable state, so that I am never offered a control that produces an inconsistent result.

#### Acceptance Criteria

1. THE App SHALL evaluate navigation button state by applying the following rules in priority order, stopping at the first matching rule:
   - **P0 (No data loaded)**: IF Current Page equals 0 AND no fetch is in flight, THEN disable both buttons. This covers the state before any page has successfully loaded and after an empty-dataset confirmation.
   - **P1 (In flight)**: IF a fetch is in flight, THEN disable both buttons.
   - **P2 (Empty dataset — reserved)**: *(Removed — subsumed by P0 and Requirement 5 Criterion 3.)*
   - **P3 (Last page confirmed — Next)**: IF Last Page Known is `true` and Current Page equals Last Confirmed Page, THEN disable Next.
   - **P4 (Probe permitted — Next)**: IF the most recent Page Response for Current Page was a Full Page, THEN enable Next.
   - **P5 (First page — Previous)**: IF Current Page equals 1, THEN disable Previous.
   - **P6 (Default — Previous)**: IF Current Page is greater than 1, THEN enable Previous.
2. WHEN any of the following change — Current Page, Last Page Known, Last Confirmed Page, fetch-in-flight status, or most-recent Count — THE App SHALL immediately re-evaluate and apply the button state from the highest-priority matching rule.

---

### Requirement 7: Loading State

**User Story:** As a user, I want to see a clear loading indicator while the application is fetching data, so that I know the application is working and has not frozen.

#### Acceptance Criteria

1. WHEN any fetch is initiated, THE App SHALL display a loading message containing the word "Loading" in the status area within 100 milliseconds.
2. WHEN a fetch completes successfully, THE App SHALL remove the loading message within 100 milliseconds.
3. IF a fetch fails, THE App SHALL remove the loading message and display an error message within 100 milliseconds of the failure.
4. IF a fetch produces no response within REQUEST_TIMEOUT_MS, THE App SHALL cancel the request, remove the loading message, and display a timeout error message.

---

### Requirement 8: Empty Dataset

**User Story:** As a user, I want to see a clear non-alarming message when the API returns no manufacturers on the first page, so that I understand the absence of data is not a fault of the application.

#### Acceptance Criteria

1. WHEN Requirement 5 Criterion 3 fires (Empty Response on page 1), THE App SHALL display a non-error informational message in the status area stating that no manufacturer records are currently available.
2. WHEN Requirement 5 Criterion 3 fires, THE App SHALL display the pagination label as "No data" rather than a page number.
3. WHEN Requirement 5 Criterion 3 fires, THE App SHALL leave the table body empty.

---

### Requirement 9: Error State and Retry

**User Story:** As a user, I want to see a clear error message and be able to retry when a fetch fails, so that a temporary network problem does not permanently prevent me from using the application.

#### Acceptance Criteria

1. WHEN a fetch fails with a network error, THE App SHALL display an error message that includes any detail the browser exposes via the exception's `message` property; if none is available, the message SHALL read "Network request failed."
2. WHEN the API returns a status code outside the 2xx range, THE App SHALL display an error message that includes the HTTP status code.
3. WHEN the API returns a response body that cannot be parsed as valid JSON, THE App SHALL display an error message stating the response was malformed.
4. WHEN the API returns a response body that is valid JSON but does not conform to the expected structure (missing `Results` array, missing or out-of-range `Count`, or `Count` inconsistent with `Results` length), THE App SHALL display an error message stating the response was structurally invalid, and SHALL display a Retry button.
5. WHEN an error message is displayed, THE App SHALL also display a Retry button in the status area.
6. WHEN the user activates the Retry button, THE App SHALL set Requested Page to Failed Page and then fetch that page. Current Page SHALL remain unchanged until the fetch succeeds.
7. WHEN a retry fetch is initiated, THE App SHALL replace the error message with the loading indicator, disable the Retry button, and disable both navigation buttons.
8. WHEN a retry fetch completes successfully, THE App SHALL remove the Retry button, set Current Page to Requested Page, clear Failed Page, and re-apply the navigation button state rules in Requirement 6.
9. WHILE an error is displayed, THE App SHALL preserve the table contents from the last successfully loaded page. IF no page has been successfully loaded, THE App SHALL leave the table empty.
10. IF a retry fetch itself fails, THE App SHALL record the new Failed Page, remove the loading indicator, and display the error message and Retry button following the same rules as Criteria 1 through 5.

---

### Requirement 10: Pagination Label

**User Story:** As a user, I want the page label to always reflect the data I am currently seeing in the table, so that I know which page I am on.

#### Acceptance Criteria

1. THE App SHALL always display the pagination label as "Page N" where N is Current Page, except in the three cases listed below.
2. WHILE the initial fetch is in progress and no page has yet been loaded, THE App SHALL display the pagination label as "Loading…".
3. IF the initial fetch fails before any data is loaded, THE App SHALL display the pagination label as "Page 1" (the page that was attempted).
4. WHEN Requirement 5 Criterion 3 fires (Empty Response on page 1), THE App SHALL display the pagination label as "No data".
5. THE App SHALL update the pagination label only after the table has been updated with new results, except when Requirement 5 Criterion 2 fires (empty probe): in that case THE App SHALL leave the label unchanged because Current Page has not changed.
6. WHILE a fetch is in flight, THE App SHALL leave the pagination label unchanged.
7. WHEN a fetch fails or times out, THE App SHALL leave the pagination label unchanged.

---

### Requirement 11: Accessible Controls

**User Story:** As a user relying on keyboard navigation or a screen reader, I want the table and pagination controls to be fully operable and understandable without a mouse.

#### Acceptance Criteria

1. THE App SHALL render the pagination controls inside a `<nav>` landmark element with an `aria-label` conveying its purpose (e.g., `aria-label="Page navigation"`).
2. THE App SHALL render the Previous and Next buttons as native `<button>` elements.
3. WHEN a button is disabled, THE App SHALL set the `disabled` attribute on that element so keyboard focus skips it and assistive technologies announce it as unavailable.
4. THE App SHALL render the table using semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, and `<td>` elements.
5. THE App SHALL render the status area as an `aria-live="polite"` region so that screen readers announce loading, success, error, and empty-dataset state changes.
6. WHEN the Retry button is rendered, THE App SHALL render it as a native `<button>` inside the live region.
7. WHEN a new page of results is rendered after a navigation action, THE App SHALL move keyboard focus to the first data cell (`<td>`) of the table.

---

### Requirement 12: Responsive Presentation

**User Story:** As a user on a mobile device, I want the manufacturer table to remain readable on a narrow screen without horizontal scrolling.

#### Acceptance Criteria

1. WHILE the viewport width is 320 px or above, THE App SHALL render all three table columns (Name, Country, Vehicle Types) as visible and the page SHALL display without a horizontal scrollbar.
2. WHEN the viewport width is below 600 px, THE App SHALL reduce table cell padding and font size so that all three column headers and their data cells fit within the viewport without content being clipped. Column hiding is not permitted at any supported viewport width.
3. WHILE the viewport width is below 600 px, THE App SHALL render each pagination button with a minimum touch target of 44 × 44 CSS pixels.
4. THE App SHALL use only relative asset paths so that all linked assets load without errors when served from any subdirectory.
