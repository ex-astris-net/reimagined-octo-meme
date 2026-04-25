// coords.js
// Pure coordinate utility functions. No imports from state or DOM.
// All transforms are derived from zoom + offsetX/Y passed in as arguments.

import { BASE_PX_PER_LY, SECTOR_SIZE, QUADRANT_LAYOUT } from './config.js';

// ── Galaxy-space → screen-space ─────────────────────────────────────────────

/**
 * Convert a galaxy coordinate (light-years) to screen pixels.
 * @param {number} gx  - galaxy X in light-years
 * @param {number} gy  - galaxy Y in light-years
 * @param {number} zoom
 * @param {number} offsetX - canvas pan offset in px
 * @param {number} offsetY
 * @returns {{ sx: number, sy: number }}
 */
export function galaxyToScreen(gx, gy, zoom, offsetX, offsetY) {
  const pxPerLy = BASE_PX_PER_LY * zoom;
  return {
    sx: gx * pxPerLy + offsetX,
    sy: gy * pxPerLy + offsetY,
  };
}

/**
 * Convert screen pixels back to galaxy light-year coordinates.
 */
export function screenToGalaxy(sx, sy, zoom, offsetX, offsetY) {
  const pxPerLy = BASE_PX_PER_LY * zoom;
  return {
    gx: (sx - offsetX) / pxPerLy,
    gy: (sy - offsetY) / pxPerLy,
  };
}

// ── Sector index → quadrant-local sector grid position ──────────────────────

/**
 * Given a sector's 0-based index and the quadrant's width (in sectors),
 * return the column (a) and row (b) within that quadrant.
 */
export function indexToGrid(index, quadrantWidth) {
  return {
    a: index % quadrantWidth,
    b: Math.floor(index / quadrantWidth),
  };
}

// ── Sector + system position → galaxy light-years ───────────────────────────

/**
 * Compute the galaxy-space position of a system.
 *
 * @param {string} quadrantName  - e.g. 'Alpha'
 * @param {number} a             - sector column within quadrant
 * @param {number} b             - sector row within quadrant
 * @param {number} x             - system X within sector (0-19)
 * @param {number} y             - system Y within sector (0-19)
 * @returns {{ gx: number, gy: number }}
 */
export function toGalaxyLY(quadrantName, a, b, x, y) {
  const q = QUADRANT_LAYOUT[quadrantName];
  if (!q) throw new Error(`Unknown quadrant: "${quadrantName}"`);
  return {
    gx: (q.ox + a) * SECTOR_SIZE + x,
    gy: (q.oy + b) * SECTOR_SIZE + y,
  };
}

// ── Quadrant bounding boxes ──────────────────────────────────────────────────

/**
 * Return the bounding box of a quadrant in galaxy light-years.
 * Requires the quadrant record (with width + height in sectors).
 *
 * @param {{ name: string, width: number, height: number }} quadrant
 * @returns {{ x1: number, y1: number, x2: number, y2: number }}
 */
export function quadrantBounds(quadrant) {
  const { ox, oy } = QUADRANT_LAYOUT[quadrant.name];
  return {
    x1: ox * SECTOR_SIZE,
    y1: oy * SECTOR_SIZE,
    x2: (ox + quadrant.width)  * SECTOR_SIZE,
    y2: (oy + quadrant.height) * SECTOR_SIZE,
  };
}

// ── Pixel-per-sector (used for LOD decisions) ────────────────────────────────

export function pxPerSector(zoom) {
  return BASE_PX_PER_LY * zoom * SECTOR_SIZE;
}

// ── Hit-testing ──────────────────────────────────────────────────────────────

/**
 * Return true if (sx, sy) in screen space is within `radiusPx` of the
 * screen position of a system with galaxy coords (gx, gy).
 */
export function isNear(sx, sy, gx, gy, radiusPx, zoom, offsetX, offsetY) {
  const { sx: mx, sy: my } = galaxyToScreen(gx, gy, zoom, offsetX, offsetY);
  return Math.hypot(sx - mx, sy - my) <= radiusPx;
}