// ui.js
// Manages all DOM UI outside the canvas/SVG: info panel, legend, load state.
// No rendering logic — that lives in grid.js and markers.js.

import { getSelectedSystem } from './state.js';

// ── DOM refs (resolved once) ─────────────────────────────────────────────────
const panel      = document.getElementById('info-panel');
const closeBtn   = document.getElementById('info-close');
const nameEl     = document.getElementById('info-name');
const quadrantEl = document.getElementById('info-quadrant');
const sectorEl   = document.getElementById('info-sector');
const factionEl  = document.getElementById('info-faction');
const datafileEl = document.getElementById('info-datafile');
const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-message');

// ── Info panel ───────────────────────────────────────────────────────────────

// Keep track of the current close listener so we can remove it before re-adding.
let _closeListener = null;

/**
 * Show the info panel for the currently selected system.
 * Call after state.selectedSystemId has been updated.
 *
 * @param {() => void} onClose  - called when user closes panel (deselect + redraw)
 */
export function showInfoPanel(onClose) {
  const sys = getSelectedSystem();
  if (!sys) { hideInfoPanel(); return; }

  // Populate fields
  nameEl.textContent     = sys.name ?? '—';
  quadrantEl.textContent = sys.quadrantName ?? '—';
  sectorEl.textContent   = sys.sectorName   ?? '—';
  factionEl.textContent  = sys.faction       ?? '—';

  // Datafile: show as "domain.tld" linked text, or '—'
  datafileEl.innerHTML = '';
  if (sys.url) {
    try {
      const hostname = new URL(sys.url).hostname;
      const display  = hostname.split('.').slice(-3).join('.');
      const a        = document.createElement('a');
      a.href         = sys.url;
      a.target       = '_blank';
      a.rel          = 'noopener noreferrer';
      a.textContent  = display;
      datafileEl.appendChild(a);
    } catch {
      datafileEl.textContent = sys.url; // fallback if URL is malformed
    }
  } else {
    datafileEl.textContent = '—';
  }

  // Wire close button (remove previous listener first to avoid stacking)
  if (_closeListener) closeBtn.removeEventListener('click', _closeListener);
  _closeListener = onClose;
  closeBtn.addEventListener('click', _closeListener);

  panel.removeAttribute('hidden');
}

export function hideInfoPanel() {
  panel.setAttribute('hidden', '');
  if (_closeListener) {
    closeBtn.removeEventListener('click', _closeListener);
    _closeListener = null;
  }
}

// ── Loading / error overlay ───────────────────────────────────────────────────

export function showLoading() {
  overlayMsg.textContent = 'Loading…';
  overlay.removeAttribute('hidden');
}

export function hideLoading() {
  overlay.setAttribute('hidden', '');
}

export function showError(msg) {
  overlayMsg.textContent = `Error: ${msg}`;
  overlay.removeAttribute('hidden');
  // Error stays visible until user acts — no auto-hide
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  {
    label: 'STAR SYSTEM',
    // Diamond: rotated square, 10×10 px swatch
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#c8d8e8" stroke-width="1.5"/>
          </svg>`,
  },
  {
    label: 'FACILITY',
    // Downward triangle
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <polygon points="7,13 1,2 13,2" fill="none" stroke="#c8d8e8" stroke-width="1.5"/>
          </svg>`,
  },
  {
    label: 'POINT OF INTEREST',
    // Square
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="10" height="10" fill="none" stroke="#c8d8e8" stroke-width="1.5"/>
          </svg>`,
  },
];

/**
 * Render the legend once on startup.
 * @param {HTMLElement} legendEl
 */
export function initLegend(legendEl) {
  legendEl.innerHTML = '';
  for (const { label, svg } of LEGEND_ITEMS) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `${svg}<span>${label}</span>`;
    legendEl.appendChild(item);
  }
}