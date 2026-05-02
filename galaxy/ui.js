// ui.js
// Manages all DOM UI outside the canvas/SVG: info panel, legend, load state.
// No rendering logic — that lives in grid.js and markers.js.

import { getSelectedSystem, getColorMode } from './state.js';
import {
  SYSTEM_TYPES,
  FACTION_COLORS, FACTION_COLOR_DEFAULT,
  TYPE_COLORS,   TYPE_COLOR_DEFAULT,
} from './config.js';


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

let _closeListener = null;

export function showInfoPanel(onClose) {
  const sys = getSelectedSystem();
  if (!sys) { hideInfoPanel(); return; }

  nameEl.textContent     = sys.name ?? '—';
  quadrantEl.textContent = sys.quadrantName ?? '—';
  sectorEl.textContent   = sys.sectorName   ?? '—';
  factionEl.textContent  = sys.faction       ?? '—';

  datafileEl.innerHTML = '';
  if (sys.url) {
    try {
      const hostname = new URL(sys.url).hostname;
      const a        = document.createElement('a');
      a.href         = sys.url;
      a.target       = '_blank';
      a.rel          = 'noopener noreferrer';
      a.textContent  = hostname;
      datafileEl.appendChild(a);
    } catch {
      datafileEl.textContent = sys.url;
    }
  } else {
    datafileEl.textContent = '—';
  }

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
  'COMPILING SHADERS',
  'OPTIMIZING MULTISPECTRAL FILTERS',
  'APPLYING REYGA ASTROMETRICS PKG',
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

function swatchSvg(shape, color) {
  const sw = 1.5;
  let inner;

  switch (shape) {
    case 'diamond': {
      const s = 5, c = s * 0.38;
      inner = `<path d="M 7,${7-s} C ${7+c},${7-c} ${7+c},${7-c} ${7+s},7 C ${7+c},${7+c} ${7+c},${7+c} 7,${7+s} C ${7-c},${7+c} ${7-c},${7+c} ${7-s},7 C ${7-c},${7-c} ${7-c},${7-c} 7,${7-s} Z"
               fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    }
    case 'triangle':
      inner = `<polygon points="7,12 2,3 12,3" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
      break;
    case 'square':
      inner = `<rect x="2" y="2" width="10" height="10" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
      break;
    case 'circle':
    default:
      inner = `<circle cx="7" cy="7" r="5" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
      break;
  }

  return `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function getLegendItems(colorMode) {
  if (colorMode === 'faction') {
    const items = Object.entries(FACTION_COLORS)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([faction, color]) => ({
        label: faction,
        svg:   swatchSvg('circle', color),
      }));
    items.push({ label: 'Other / Unknown', svg: swatchSvg('circle', FACTION_COLOR_DEFAULT) });
    return items;
  }

  // colorMode === 'type': iterate SYSTEM_TYPES so order and labels are canonical
  return Object.entries(SYSTEM_TYPES).map(([typeName, shape]) => ({
    label: typeName,
    svg:   swatchSvg(shape, TYPE_COLORS[typeName] ?? TYPE_COLOR_DEFAULT),
  }));
}

export function renderLegend(legendEl) {
  const items = getLegendItems(getColorMode());
  legendEl.innerHTML = '';
  for (const { label, svg } of items) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `${svg}<span>${label}</span>`;
    legendEl.appendChild(item);
  }
}

export const initLegend = renderLegend;