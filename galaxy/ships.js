// ships.js
// Loads starship positions from per-ship CSV route docs and renders them on the SVG.
// Call loadShipPositions() once after setData(). Call drawShips() on every render frame.

import { toGalaxyLY, galaxyToScreen } from './coords.js';
import { getData, getStarships, getHoveredShipId, getSearchQuery, getColorMode } from './state.js';
import { FONT_UI, FONT_LABEL, FACTION_COLORS, FACTION_COLOR_DEFAULT } from './config.js';

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

  const systemName   = latest.system?.trim();
  const sectorName   = latest.sector?.trim();
  const quadrantName = latest.quadrant?.trim();

  // ── System-pinned position ─────────────────────────────────────────────────
  // If a system name is provided, look it up directly and use its gx/gy.
  // x/y/sector are ignored in this case.
  if (systemName) {
    const { systems } = getData();
    const sys = systems.find(s => s.name === systemName);
    if (!sys) {
      console.warn(`[ships] unknown system "${systemName}" for ship "${ship.name}"`);
      return null;
    }
    return {
      timestamp: latest.timestamp,
      quadrant:  sys.quadrantName,
      sector:    sys.sectorName,
      system:    systemName,
      x: sys.x, y: sys.y,
      gx: sys.gx, gy: sys.gy,
    };
  }

  // ── Coordinate-based position ──────────────────────────────────────────────
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

  return { timestamp: latest.timestamp, quadrant: quadrantName, sector: sectorName, system: null, x, y, gx, gy };
}

// ── Public: data loading ──────────────────────────────────────────────────────

const SYSTEM_PIN_DY     = 0.80;  // ly below system per row
const SYSTEM_PIN_STRIDE = 0.50;  // ly horizontal stride between ships in a group

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

  const positioned = results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);

  // Apply galaxy-space offsets to system-pinned ships so they spread out
  // naturally below their system marker under normal zoom/pan math.
  const bySystem = {};
  for (const ship of positioned) {
    const key = ship.position?.system;
    if (key) (bySystem[key] = bySystem[key] ?? []).push(ship);
  }
  for (const group of Object.values(bySystem)) {
    const count = group.length;
    group.forEach((ship, idx) => {
      const dx = (idx - (count - 1) / 2) * SYSTEM_PIN_STRIDE;
      ship.gx = ship.gx + dx;
      ship.gy = ship.gy + SYSTEM_PIN_DY;
    });
  }

  return positioned;
}

// ── SVG group init ────────────────────────────────────────────────────────────

export function initShipGroup(svg) {
  const shipMarkerGroup = document.createElementNS(SVG_NS, 'g');
  const shipLabelGroup  = document.createElementNS(SVG_NS, 'g');
  shipMarkerGroup.setAttribute('id', 'ship-marker-group');
  shipLabelGroup.setAttribute('id', 'ship-label-group');
  svg.appendChild(shipMarkerGroup);
  svg.appendChild(shipLabelGroup);
  return { shipMarkerGroup, shipLabelGroup };
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
const LABEL_SERIAL_SIZE = 13;  // px, serial line
const LABEL_PAD_X       = 10;
const LABEL_PAD_Y       = 6;
const LABEL_LINE_GAP    = 5;   // px between name and serial baselines
const LABEL_ACCENT_DEFAULT = '#00ffc8';  // type-mode fallback

function resolveAccent(ship, colorMode) {
  if (colorMode === 'faction') {
    return FACTION_COLORS[ship.faction] ?? FACTION_COLOR_DEFAULT;
  }
  return LABEL_ACCENT_DEFAULT;
}

function accentDim(hex) {
  // Return a low-opacity version of any hex color for the serial line
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.55)`;
}

function buildShipLabel(ship, tokenHalfSize, accent) {
  const serialClr = accentDim(accent);
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
    stroke: accent,
    'stroke-width': 0.75,
    rx: 2,
  }));

  // Left accent bar
  g.appendChild(svgEl('rect', {
    x: 0, y: 0, width: 2, height: rectH,
    fill: accent,
    rx: 1,
  }));

  // Ship name
  const nameText = svgEl('text', {
    x:                  LABEL_PAD_X + 2,
    y:                  LABEL_PAD_Y + LABEL_FONT_SIZE,
    'font-family':      FONT_UI,
    'font-size':        LABEL_FONT_SIZE,
    'font-weight':      700,
    fill:               accent,
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
      'font-weight': 700,
      fill:          serialClr,
    });
    serialText.textContent = ship.serial;
    g.appendChild(serialText);
  }

  return g;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

export function drawShips(shipMarkerGroup, shipLabelGroup, ships, { zoom, offsetX, offsetY }) {
  shipMarkerGroup.innerHTML = '';
  shipLabelGroup.innerHTML  = '';
  if (!ships.length) return;

  const hoveredShipId = getHoveredShipId();
  const searchQuery   = getSearchQuery();
  const colorMode     = getColorMode();
  const hasSearch     = searchQuery.length > 0;

  const W = shipMarkerGroup.ownerSVGElement?.clientWidth  ?? window.innerWidth;
  const H = shipMarkerGroup.ownerSVGElement?.clientHeight ?? window.innerHeight;

  const halfSize = tokenSize(zoom);

  for (const ship of ships) {
    const { sx, sy } = galaxyToScreen(ship.gx, ship.gy, zoom, offsetX, offsetY);

    if (sx < -80 || sy < -80 || sx > W + 80 || sy > H + 80) continue;

    const isHovered   = ship.id === hoveredShipId;
    const searchMatch = hasSearch && (
      ship.name.toLowerCase().includes(searchQuery)      ||
      ship.serial.toLowerCase().includes(searchQuery)    ||
      ship.shipClass.toLowerCase().includes(searchQuery)
    );
    const dimmed    = hasSearch && !searchMatch && !isHovered;
    const showLabel = isHovered || searchMatch;
    const accent    = resolveAccent(ship, colorMode);

    // ── Marker ──────────────────────────────────────────────────────────────
    const mg = svgEl('g', {
      transform:      `translate(${sx},${sy})`,
      'data-ship-id': ship.id,
    });

    if (ship.tokenUrl) {
      const imgAttrs = {
        href:   ship.tokenUrl,
        x:      -halfSize,
        y:      -halfSize,
        width:  halfSize * 2,
        height: halfSize * 2,
        preserveAspectRatio: 'xMidYMid meet',
      };
      if (dimmed) imgAttrs.style = 'opacity: 0.2;';
      mg.appendChild(svgEl('image', imgAttrs));
    } else {
      const s = halfSize * 0.7, c = s * 0.38;
      mg.appendChild(svgEl('path', {
        d: `M 0,${-s} C ${c},${-c} ${c},${-c} ${s},0 C ${c},${c} ${c},${c} 0,${s} C ${-c},${c} ${-c},${c} ${-s},0 C ${-c},${-c} ${-c},${-c} 0,${-s} Z`,
        fill:   dimmed ? 'rgba(0,255,200,0.06)' : 'rgba(0,255,200,0.3)',
        stroke: dimmed ? 'rgba(0,255,200,0.2)'  : '#00ffc8',
        'stroke-width': 1.5,
      }));
    }
    shipMarkerGroup.appendChild(mg);

    // ── Label ───────────────────────────────────────────────────────────────
    if (showLabel) {
      const lg = svgEl('g', { transform: `translate(${sx},${sy})` });
      lg.appendChild(buildShipLabel(ship, halfSize, accent));
      shipLabelGroup.appendChild(lg);
    }
  }
}