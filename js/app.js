/* Completed after the Kiro-generated HTML/CSS handoff. No build step required. */
(function () {
  'use strict';

  const API_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetAllManufacturers?format=json&page=';
  const USE_PROXY = false; // Set true only after deploying and verifying proxy.php.
  const PROXY_URL = 'proxy.php?page=';
  const REQUEST_TIMEOUT_MS = 10000;
  const PAGE_SIZE = 100;

  const state = {
    currentPage: 0, requestedPage: 1, failedPage: null,
    lastConfirmedPage: null, lastCount: 0, loading: false
  };
  const previous = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  const label = document.getElementById('pagination-label');
  const status = document.getElementById('status');
  const rows = document.getElementById('table-body');
  const table = rows.closest('table');

  function updateButtons() {
    const unavailable = state.loading || state.currentPage === 0;
    previous.disabled = unavailable || state.currentPage <= 1;
    next.disabled = unavailable || state.lastCount !== PAGE_SIZE ||
      (state.lastConfirmedPage !== null && state.currentPage >= state.lastConfirmedPage);
    table.setAttribute('aria-busy', String(state.loading));
  }

  function showStatus(message, kind, retry) {
    status.className = kind ? 'status--' + kind : '';
    status.replaceChildren();
    const text = document.createElement('span');
    text.textContent = message;
    status.append(text);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Retry';
      button.addEventListener('click', function () {
        if (!state.loading && state.failedPage !== null) loadPage(state.failedPage, true);
      });
      status.append(document.createTextNode(' '), button);
    }
  }

  function validate(data) {
    if (!data || !Array.isArray(data.Results) || !Number.isInteger(data.Count) ||
        data.Count < 0 || data.Count > PAGE_SIZE || data.Count !== data.Results.length) {
      throw new Error('Response structure invalid. Please retry.');
    }
    for (const record of data.Results) {
      if (!record || !Number.isInteger(record.Mfr_ID) ||
          typeof record.Mfr_Name !== 'string' || !record.Mfr_Name.trim() ||
          !(record.Mfr_CommonName == null || typeof record.Mfr_CommonName === 'string') ||
          !(record.Country == null || typeof record.Country === 'string') ||
          !Array.isArray(record.VehicleTypes) || record.VehicleTypes.some(function (type) {
            return !type || typeof type.Name !== 'string';
          })) {
        throw new Error('Manufacturer record structure invalid. Please retry.');
      }
    }
  }

  function render(records) {
    const fragment = document.createDocumentFragment();
    for (const record of records) {
      const row = document.createElement('tr');
      const values = [
        record.Mfr_CommonName && record.Mfr_CommonName.trim() ? record.Mfr_CommonName : record.Mfr_Name,
        record.Country || '',
        record.VehicleTypes.map(function (type) { return type.Name; }).join(', ')
      ];
      for (const value of values) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
  }

  async function loadPage(page, userAction) {
    if (state.loading || !Number.isInteger(page) || page < 1) return;
    state.loading = true;
    state.requestedPage = page;
    const initial = state.currentPage === 0;
    if (initial) label.textContent = 'Loading…';
    showStatus('Loading page ' + page + '…', 'loading', false);
    updateButtons();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch((USE_PROXY ? PROXY_URL : API_BASE_URL) + page, {
        signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP error: ' + response.status + '. Please retry.');
      const data = await response.json();
      validate(data); // No UI data changes until the entire page has passed validation.
      state.failedPage = null;
      if (data.Count === 0) {
        if (page === 1) {
          render([]);
          state.currentPage = 0;
          state.lastCount = 0;
          state.lastConfirmedPage = 0;
          label.textContent = 'No data';
          showStatus('No manufacturer records are currently available.', 'empty', false);
        } else {
          state.lastConfirmedPage = page - 1;
          showStatus('No records on page ' + page + '. The displayed page has been preserved.', 'empty', false);
        }
        state.requestedPage = state.currentPage;
      } else {
        if (data.Count < PAGE_SIZE) {
          state.lastConfirmedPage = page;
        } else if (state.lastConfirmedPage !== null && page >= state.lastConfirmedPage) {
          state.lastConfirmedPage = null;
        }
        render(data.Results);
        state.currentPage = page;
        state.lastCount = data.Count;
        label.textContent = 'Page ' + page;
        showStatus('Page ' + page + ' loaded: ' + data.Count + ' manufacturers.', 'success', false);
        if (userAction) {
          const first = rows.querySelector('td');
          if (first) { first.tabIndex = -1; first.focus(); }
        }
      }
    } catch (error) {
      state.failedPage = page;
      state.requestedPage = state.currentPage;
      if (initial) label.textContent = 'Page 1';
      const message = timedOut ? 'Request timed out after 10 seconds. Please retry.' :
        error instanceof SyntaxError ? 'Response could not be parsed as JSON. Please retry.' :
        error instanceof TypeError ? 'Network request failed. Check your connection or API access, then retry.' :
        error.message || 'Request failed. Please retry.';
      showStatus(message, 'error', true);
    } finally {
      clearTimeout(timeout);
      state.loading = false;
      updateButtons();
    }
  }

  previous.addEventListener('click', function () {
    if (!previous.disabled) loadPage(state.currentPage - 1, true);
  });
  next.addEventListener('click', function () {
    if (!next.disabled) loadPage(state.currentPage + 1, true);
  });
  loadPage(1, false);
})();
