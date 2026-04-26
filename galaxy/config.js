// config.js
// All static constants. Nothing here should change at runtime.

// ── Lambda endpoint ────────────────────────────────────────────────────────
export const LAMBDA_URL =
  'https://9xo769s5o3.execute-api.us-west-2.amazonaws.com/default/galaxy-map-airtable';

// ── Rendering constants ────────────────────────────────────────────────────
export const BASE_PX_PER_LY   = 8;   // pixels per light-year at zoom 1
export const SECTOR_SIZE       = 20;  // light-years per sector edge
export const LY_GRID_FADE_ZOOM = 2.5; // zoom level at which 1-ly grid fades in
export const SECTOR_LABEL_MIN_PX = 60; // min px-per-sector before sector names appear

// ── Marker sizing ──────────────────────────────────────────────────────────
export const MARKER_BASE_SIZE  = 6;   // base half-size in ly units
export const MARKER_MAX_PX     = 14;  // max rendered half-size in pixels
export const LABEL_BASE_SIZE   = 14;  // base font size in px at zoom 1
export const LABEL_MAX_PX      = 18;  // cap on label font size
export const LABEL_BG_FILL     = 'rgba(11,22,33,0.80)';
export const LABEL_BG_STROKE   = 'rgba(33,44,55,0.80)';
export const LABEL_ACTIVE_FILL = '#00ff0040';
export const LABEL_ACTIVE_STROKE = '#00ff00';

// ── Interaction ────────────────────────────────────────────────────────────
export const DRAG_THRESHOLD_PX = 4;   // pixels moved before a mousedown becomes a pan
export const FETCH_RETRIES     = 3;
export const FETCH_RETRY_DELAY = 1000; // ms

// ── Quadrant layout ────────────────────────────────────────────────────────
// ox/oy are offsets in sector units from the canvas origin.
// Positive oy is downward on screen.
export const QUADRANT_LAYOUT = {
  Alpha: { ox:  0, oy:  0, color: '#e8a020' },
  Beta:  { ox:  5, oy:  2, color: '#3a8fd4' },
  Gamma: { ox:  0, oy: -5, color: '#9b4fd4' },
  Delta: { ox:  7, oy: -5, color: '#d44f6a' },
};

// ── System types ───────────────────────────────────────────────────────────
// Shape keys consumed by the marker renderer.
export const SYSTEM_TYPES = {
  'Star System':      'diamond',
  'Facility':         'triangle',
  'Point of Interest':'circle',
  'Unexplored':       'square'
};

// ── Faction colors ────────────────────────────────────────────────────────
export const FACTION_COLORS = {
  'United Federation of Planets': '#4a90d9',
  'Romulan Republic':             '#4caf7d',
  'Klingon Defense Force':        '#c0392b',
  'Independent':                  '#888899',
};
export const FACTION_COLOR_DEFAULT = '#556677'; // fallback for unknown factions

// ── Type colors ────────────────────────────────────────────────────────────
export const TYPE_COLORS = {
  'Star System':      '#40c8e8',
  'Facility':         '#e8c840',
  'Point of Interest':'#7b68ee',
  'Unexplored':       '#556677',
};
export const TYPE_COLOR_DEFAULT = '#336699';

// ── Fonts ──────────────────────────────────────────────────────────────────
export const FONT_UI      = 'Orbitron, sans-serif';
export const FONT_LABEL   = 'Lekton, monospace';