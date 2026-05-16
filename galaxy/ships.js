// ships.js
// Loads starship positions from per-ship CSV route docs and renders them on the SVG.
// Call loadShipPositions() once after setData(). Call drawShips() on every render frame.

import { toGalaxyLY, galaxyToScreen } from './coords.js';
import { getData, getStarships, getHoveredShipId, getSearchQuery } from './state.js';
import { FONT_UI, FONT_LABEL } from './config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Token sizing (mirrors markerSize logic in markers.js) ─────────────────────
const TOKEN_BASE_PX = 10;   // half-size at zoom 1
const TOKEN_MAX_PX  = 28;   // half-size cap

function tokenSize(zoom) {
  return Math.min(TOKEN_BASE_PX * zoom, TOKEN_MAX_PX);
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]));
  });
}

function parseDate(str) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ── Sector lookup ─────────────────────────────────────────────────────────────

function findSector(sectorName) {
  const { sectors } = getData();
  return sectors.find(s => s.name === sectorName) ?? null;
}

// ── Route doc fetch ───────────────────────────────────────────────────────────

async function fetchLatestPosition(ship) {
  if (!ship.routeDocUrl) return null;

  let text;
  try {
    const resp = await fetch(ship.routeDocUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    text = await resp.text();
  } catch (err) {
    console.warn(`[ships] failed to fetch route doc for "${ship.name}":`, err.message);
    return null;
  }

  const rows = parseCsv(text);
  if (!rows.length) return null;

  const latest = rows.reduce((best, row) => {
    return parseDate(row.timestamp) > parseDate(best.timestamp) ? row : best;
  }, rows[0]);

  const sectorName   = latest.sector?.trim();
  const quadrantName = latest.quadrant?.trim();
  const x = parseFloat(latest.x);
  const y = parseFloat(latest.y);

  if (!sectorName || !quadrantName || isNaN(x) || isNaN(y)) {
    console.warn(`[ships] incomplete route row for "${ship.name}":`, latest);
    return null;
  }

  const sec = findSector(sectorName);
  if (!sec) {
    console.warn(`[ships] unknown sector "${sectorName}" for ship "${ship.name}"`);
    return null;
  }

  let gx, gy;
  try {
    ({ gx, gy } = toGalaxyLY(quadrantName, sec.a, sec.b, x, y));
  } catch (err) {
    console.warn(`[ships] coord error for "${ship.name}":`, err.message);
    return null;
  }

  return { timestamp: latest.timestamp, quadrant: quadrantName, sector: sectorName, x, y, gx, gy };
}

// ── Public: data loading ──────────────────────────────────────────────────────

export async function loadShipPositions() {
  const starships = getStarships();
  if (!starships.length) return [];

  const results = await Promise.allSettled(
    starships.map(async ship => {
      const pos = await fetchLatestPosition(ship);
      if (!pos) return null;
      return { ...ship, position: pos, gx: pos.gx, gy: pos.gy };
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

// ── SVG group init ────────────────────────────────────────────────────────────

export function initShipGroup(svg) {
  const shipGroup = document.createElementNS(SVG_NS, 'g');
  shipGroup.setAttribute('id', 'ship-group');
  svg.appendChild(shipGroup); // appended last → renders above markers + labels
  return shipGroup;
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── Label builder ─────────────────────────────────────────────────────────────
// Distinct from system labels: uses Orbitron, tighter tracking, no rect stroke glow.
// Two lines: name (top), serial (bottom, dimmer).

const LABEL_FONT_SIZE   = 13;  // px, name line
const LABEL_SERIAL_SIZE = 10;  // px, serial line
const LABEL_PAD_X       = 10;
const LABEL_PAD_Y       = 6;
const LABEL_LINE_GAP    = 5;   // px between name and serial baselines
const LABEL_ACCENT     = '#00ffc8';
const LABEL_SERIAL_CLR = 'rgba(0,255,200,0.55)';

function buildShipLabel(ship, tokenHalfSize) {
  // Orbitron is wide — 0.72 ch/px fits better than the generic 0.58.
  // Lekton is narrower so 0.60 is fine for the serial line.
  // Add a small fixed buffer (4px) to absorb rounding drift.
  const nameW   = ship.name.length   * LABEL_FONT_SIZE   * 0.72 + 4;
  const serialW = ship.serial.length * LABEL_SERIAL_SIZE * 0.60 + 4;
  const contentW = Math.max(nameW, serialW);
  const rectW    = contentW + LABEL_PAD_X * 2;
  const rectH    = LABEL_FONT_SIZE + LABEL_LINE_GAP + LABEL_SERIAL_SIZE + LABEL_PAD_Y * 2;

  // Position label to the right of the token with a small gap
  const offsetX = tokenHalfSize + 6;
  const offsetY = -rectH / 2;

  const g = svgEl('g', { transform: `translate(${offsetX}, ${offsetY})` });

  // Background
  g.appendChild(svgEl('rect', {
    x: 0, y: 0, width: rectW, height: rectH,
    fill:   'rgba(10,10,20,0.85)',
    stroke: LABEL_ACCENT,
    'stroke-width': 0.75,
    rx: 2,
  }));

  // Left accent bar
  g.appendChild(svgEl('rect', {
    x: 0, y: 0, width: 2, height: rectH,
    fill: LABEL_ACCENT,
    rx: 1,
  }));

  // Ship name
  const nameText = svgEl('text', {
    x:                  LABEL_PAD_X + 2,
    y:                  LABEL_PAD_Y + LABEL_FONT_SIZE,
    'font-family':      FONT_UI,
    'font-size':        LABEL_FONT_SIZE,
    'font-weight':      700,
    fill:               LABEL_ACCENT,
    'letter-spacing':   '0.05em',
  });
  nameText.textContent = ship.name;
  g.appendChild(nameText);

  // Serial
  if (ship.serial) {
    const serialText = svgEl('text', {
      x:             LABEL_PAD_X + 2,
      y:             LABEL_PAD_Y + LABEL_FONT_SIZE + LABEL_LINE_GAP + LABEL_SERIAL_SIZE,
      'font-family': FONT_LABEL,
      'font-size':   LABEL_SERIAL_SIZE,
      fill:          LABEL_SERIAL_CLR,
    });
    serialText.textContent = ship.serial;
    g.appendChild(serialText);
  }

  return g;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

export function drawShips(shipGroup, ships, { zoom, offsetX, offsetY }) {
  shipGroup.innerHTML = '';
  if (!ships.length) return;

  const hoveredShipId = getHoveredShipId();
  const searchQuery   = getSearchQuery();
  const hasSearch     = searchQuery.length > 0;

  const W = shipGroup.ownerSVGElement?.clientWidth  ?? window.innerWidth;
  const H = shipGroup.ownerSVGElement?.clientHeight ?? window.innerHeight;

  const halfSize = tokenSize(zoom);

  for (const ship of ships) {
    const { sx, sy } = galaxyToScreen(ship.gx, ship.gy, zoom, offsetX, offsetY);

    if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) continue;

    const isHovered    = ship.id === hoveredShipId;
    const searchMatch  = hasSearch && (
      ship.name.toLowerCase().includes(searchQuery)      ||
      ship.serial.toLowerCase().includes(searchQuery)    ||
      ship.shipClass.toLowerCase().includes(searchQuery)
    );
    const dimmed       = hasSearch && !searchMatch && !isHovered;
    const showLabel    = isHovered || searchMatch;

    const g = svgEl('g', {
      transform:      `translate(${sx},${sy})`,
      'data-ship-id': ship.id,
    });

    if (ship.tokenUrl) {
      g.appendChild(svgEl('image', {
        href:   ship.tokenUrl,
        x:      -halfSize,
        y:      -halfSize,
        width:  halfSize * 2,
        height: halfSize * 2,
        preserveAspectRatio: 'xMidYMid meet',
        style: dimmed ? 'opacity: 0.2;' : '',
      }));
    } else {
      // Fallback diamond
      const s = halfSize * 0.7, c = s * 0.38;
      g.appendChild(svgEl('path', {
        d: `M 0,${-s} C ${c},${-c} ${c},${-c} ${s},0 C ${c},${c} ${c},${c} 0,${s} C ${-c},${c} ${-c},${c} ${-s},0 C ${-c},${-c} ${-c},${-c} 0,${-s} Z`,
        fill:   dimmed ? 'rgba(0,255,200,0.06)' : 'rgba(0,255,200,0.3)',
        stroke: dimmed ? 'rgba(0,255,200,0.2)'  : '#00ffc8',
        'stroke-width': 1.5,
      }));
    }

    if (showLabel) {
      g.appendChild(buildShipLabel(ship, halfSize));
    }

    shipGroup.appendChild(g);
  }
}