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
const overlay        = document.getElementById('overlay');
const lcarsLoader    = document.getElementById('lcars-loader');
const lcarsStatus    = document.getElementById('lcars-status');
const lcarsSubtext   = document.getElementById('lcars-subtext');
const lcarsStardate  = document.getElementById('lcars-stardate');
const lcarsSegs      = Array.from(document.querySelectorAll('.lcars-seg'));
const overlayError   = document.getElementById('overlay-error');
const overlayMessage = document.getElementById('overlay-message');

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
      const display  = hostname;
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

// ── LCARS animation ───────────────────────────────────────────────────────────

const LCARS_STATUSES = [
  'INITIALIZING',
  'ACCESSING ASTROMETRIC DATABASE',
  'VERIFYING SECTOR COORDINATES',
  'LOADING NAVIGATIONAL DATA',
  'CALIBRATING SENSOR ARRAY',
  'RESOLVING QUADRANT BOUNDARIES',
  'SYNCHRONIZING STARFIELD',
  'CROSS-REFERENCING FEDERATION CHARTS',
  'ALMOST THERE',
];

const LCARS_SUBTEXTS = [
  'ACCESSING ASTROMETRIC DATABASE',
  'STARFLEET CARTOGRAPHY DIVISION',
  'MEMORY ALPHA UPLINK ACTIVE',
  'LONG RANGE SENSOR SWEEP',
  'FEDERATION STANDARD COORDINATE SYSTEM',
  'PLEASE STAND BY',
];

let _lcarsInterval = null;
let _lcarsFrame    = 0;

function lcarsStep() {
  _lcarsFrame++;

  const filled = (_lcarsFrame % (lcarsSegs.length + 4));
  lcarsSegs.forEach((seg, i) => {
    seg.classList.toggle('lit',        i < filled);
    seg.classList.toggle('lit-bright', i === filled - 1);
  });

  if (_lcarsFrame % 3 === 0) {
    const idx = Math.floor(_lcarsFrame / 3) % LCARS_STATUSES.length;
    lcarsStatus.textContent = LCARS_STATUSES[idx];
  }

  if (_lcarsFrame % 5 === 0) {
    const idx = Math.floor(_lcarsFrame / 5) % LCARS_SUBTEXTS.length;
    lcarsSubtext.textContent = LCARS_SUBTEXTS[idx];
  }
}

// ── Loading / error overlay ───────────────────────────────────────────────────

export function showLoading() {
  overlayError.setAttribute('hidden', '');
  lcarsLoader.removeAttribute('hidden');
  _lcarsFrame = 0;
  overlay.removeAttribute('hidden');
  _lcarsInterval = setInterval(lcarsStep, 280);
  lcarsStep();
}

export function hideLoading() {
  clearInterval(_lcarsInterval);
  _lcarsInterval = null;
  overlay.setAttribute('hidden', '');
}

export function showError(msg) {
  clearInterval(_lcarsInterval);
  _lcarsInterval = null;
  lcarsLoader.setAttribute('hidden', '');
  overlayMessage.textContent = msg;
  overlayError.removeAttribute('hidden');
  overlay.removeAttribute('hidden');
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  {
    label: 'Star System',
    // Diamond: rotated square, 10×10 px swatch
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <polygon points="7,1 13,7 7,13 1,7" fill="none" stroke="#c8d8e8" stroke-width="1.5"/>
          </svg>`,
  },
  {
    label: 'Facility',
    // Downward triangle
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
            <polygon points="7,13 1,2 13,2" fill="none" stroke="#c8d8e8" stroke-width="1.5"/>
          </svg>`,
  },
  {
    label: 'Point of Interest',
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