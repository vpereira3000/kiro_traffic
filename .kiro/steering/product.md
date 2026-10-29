# Product

## Purpose
A single-screen web application that lets users browse vehicle manufacturers registered with the NHTSA (National Highway Traffic Safety Administration). Users navigate through pages of 100 records at a time, each page fetched on demand from the NHTSA public API.

## Intended users
General public or internal users who need a quick, readable view of the NHTSA manufacturer registry. No authentication is required.

## Scope
- Display a responsive table of vehicle manufacturers.
- Each row shows: Common Name (`Mfr_CommonName`, falling back to `Mfr_Name` when null), Country, and Vehicle Types (comma-separated list of type names, empty when none).
- Server-side pagination: one API call per page, 100 records per page, pages 1–232.
- Page navigation controls: previous / next buttons and a current-page indicator.
- No search, no filtering, no sorting in this version.

## Goals
- Fast to load: no framework overhead, no build step.
- Easy to maintain: plain HTML, CSS, and JavaScript.
- Deployable to shared MochaHost hosting with no special server configuration beyond file upload.
- Accessible and readable on both desktop and mobile viewports.

## Out of scope (this version)
- Authentication or user accounts.
- Search or filter functionality.
- Manufacturer detail pages.
- Data caching or local storage.
