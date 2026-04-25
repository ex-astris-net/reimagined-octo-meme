// grid.js
// Draws the canvas layer: quadrant fills, sector grid, 1-ly grid, sector labels.
// Call drawGrid() on every render frame.

import {
  QUADRANT_LAYOUT, BASE_PX_PER_LY, SECTOR_SIZE,
  LY_GRID_FADE_ZOOM, SECTOR_LABEL_MIN_PX, FONT_UI, FONT_LABEL,
} from './config.js';
import { galaxyToScreen, quadrantBounds, pxPerSector } from './coords.js';
import { getData } from './state.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Convert galaxy LY coords to canvas pixels
function g2s(gx, gy, zoom, ox, oy) {
  const ppl = BASE_PX_PER_LY * zoom;
  return { x: gx * ppl + ox, y: gy * ppl + oy };
}

// ── Draw pass helpers ─────────────────────────────────────────────────────────

function drawQuadrantFills(ctx, quadrants, zoom, offsetX, offsetY, W, H) {
  for (const q of quadrants) {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) continue;
    const bounds = quadrantBounds(q);
    const tl = g2s(bounds.x1, bounds.y1, zoom, offsetX, offsetY);
    const br = g2s(bounds.x2, bounds.y2, zoom, offsetX, offsetY);

    // Skip if entirely off-screen
    if (br.x < 0 || br.y < 0 || tl.x > W || tl.y > H) continue;

    const rgb = hexToRgb(layout.color);
    ctx.fillStyle = `rgba(${rgb},0.06)`;
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // Border
    ctx.strokeStyle = `rgba(${rgb},0.25)`;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }
}

function drawQuadrantLabels(ctx, quadrants, zoom, offsetX, offsetY, W, H) {
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  for (const q of quadrants) {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) continue;
    const bounds = quadrantBounds(q);

    // Label centred on the quadrant region
    const cx = (bounds.x1 + bounds.x2) / 2;
    const cy = (bounds.y1 + bounds.y2) / 2;
    const { x, y } = g2s(cx, cy, zoom, offsetX, offsetY);

    if (x < -200 || y < -200 || x > W + 200 || y > H + 200) continue;

    const rgb = hexToRgb(layout.color);
    // Fixed size: pinned to width=5 (Alpha) so all quadrants render the same size label.
    const fontSize = clamp(pxPerSector(zoom) * 5 * 0.18, 18, 80);
    ctx.font      = `700 ${fontSize}px ${FONT_UI}`;
    ctx.fillStyle = `rgba(${rgb},0.12)`;
    ctx.fillText(q.name.toUpperCase() + ' QUADRANT', x, y);
  }
}

function drawSectorGrid(ctx, quadrants, zoom, offsetX, offsetY, W, H) {
  const ppl = BASE_PX_PER_LY * zoom;
  const sectorPx = ppl * SECTOR_SIZE;

  ctx.strokeStyle = 'rgba(180,200,220,0.12)';
  ctx.lineWidth   = 0.75;

  for (const q of quadrants) {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) continue;
    const bounds = quadrantBounds(q);

    // Vertical sector lines
    for (let col = 0; col <= q.width; col++) {
      const gx = bounds.x1 + col * SECTOR_SIZE;
      const sx = gx * ppl + offsetX;
      if (sx < 0 || sx > W) continue;
      const top    = bounds.y1 * ppl + offsetY;
      const bottom = bounds.y2 * ppl + offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, Math.max(0, top));
      ctx.lineTo(sx, Math.min(H, bottom));
      ctx.stroke();
    }

    // Horizontal sector lines
    for (let row = 0; row <= q.height; row++) {
      const gy = bounds.y1 + row * SECTOR_SIZE;
      const sy = gy * ppl + offsetY;
      if (sy < 0 || sy > H) continue;
      const left  = bounds.x1 * ppl + offsetX;
      const right = bounds.x2 * ppl + offsetX;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, left), sy);
      ctx.lineTo(Math.min(W, right), sy);
      ctx.stroke();
    }
  }
}

function drawLyGrid(ctx, quadrants, zoom, offsetX, offsetY, W, H) {
  // Fade in between LY_GRID_FADE_ZOOM and LY_GRID_FADE_ZOOM * 1.5
  const alpha = clamp((zoom - LY_GRID_FADE_ZOOM) / (LY_GRID_FADE_ZOOM * 0.5), 0, 1);
  if (alpha === 0) return;

  const ppl = BASE_PX_PER_LY * zoom;
  ctx.strokeStyle = `rgba(180,200,220,${0.06 * alpha})`;
  ctx.lineWidth   = 0.5;

  for (const q of quadrants) {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) continue;
    const bounds = quadrantBounds(q);

    const x1px = bounds.x1 * ppl + offsetX;
    const x2px = bounds.x2 * ppl + offsetX;
    const y1px = bounds.y1 * ppl + offsetY;
    const y2px = bounds.y2 * ppl + offsetY;

    // Vertical 1-ly lines
    for (let lx = bounds.x1; lx <= bounds.x2; lx++) {
      const sx = lx * ppl + offsetX;
      if (sx < 0 || sx > W) continue;
      // Skip lines that coincide with sector grid
      if (lx % SECTOR_SIZE === 0) continue;
      ctx.beginPath();
      ctx.moveTo(sx, Math.max(0, y1px));
      ctx.lineTo(sx, Math.min(H, y2px));
      ctx.stroke();
    }

    // Horizontal 1-ly lines
    for (let ly = bounds.y1; ly <= bounds.y2; ly++) {
      const sy = ly * ppl + offsetY;
      if (sy < 0 || sy > H) continue;
      if (ly % SECTOR_SIZE === 0) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, x1px), sy);
      ctx.lineTo(Math.min(W, x2px), sy);
      ctx.stroke();
    }
  }
}

function drawSectorLabels(ctx, sectors, zoom, offsetX, offsetY, W, H) {
  const pps = pxPerSector(zoom);
  if (pps < SECTOR_LABEL_MIN_PX) return;

  // Font size scales with zoom but is capped — no minimum removal so it
  // stays visible at all zoom levels above the appearance threshold.
  const fontSize = clamp(pps * 0.10, 8, 24);
  const ppl      = BASE_PX_PER_LY * zoom;
  const PAD      = 10; // px inset from sector top-left corner

  ctx.font         = `${fontSize}px ${FONT_LABEL}`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';

  for (const sec of sectors) {
    const layout = QUADRANT_LAYOUT[sec.quadrantName];
    if (!layout || sec.a === undefined) continue;

    // Top-left corner of this sector in screen space
    const glx = (layout.ox + sec.a) * SECTOR_SIZE;
    const gly = (layout.oy + sec.b) * SECTOR_SIZE;
    const sx  = glx * ppl + offsetX + PAD;
    const sy  = gly * ppl + offsetY + PAD;

    // Cull — use a generous margin so labels near edges aren't clipped mid-glyph
    if (sx > W + 60 || sy > H + 20 || sx < -120 || sy < -20) continue;

    const rgb = hexToRgb(layout.color);
    ctx.fillStyle = `rgba(${rgb},0.55)`;
    ctx.fillText(sec.name.toUpperCase(), sx, sy);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ zoom: number, offsetX: number, offsetY: number }} viewport
 */
export function drawGrid(ctx, { zoom, offsetX, offsetY }) {
  // Use CSS pixel dimensions (clientWidth/Height) since ctx is scaled by DPR
  const W = ctx.canvas.clientWidth  || ctx.canvas.width;
  const H = ctx.canvas.clientHeight || ctx.canvas.height;

  // 1. Clear
  ctx.clearRect(0, 0, W, H);

  const { quadrants, sectors } = getData();
  if (!quadrants.length) return; // data not loaded yet

  // 2. Quadrant fills + borders
  drawQuadrantFills(ctx, quadrants, zoom, offsetX, offsetY, W, H);

  // 3. Faded quadrant name labels
  drawQuadrantLabels(ctx, quadrants, zoom, offsetX, offsetY, W, H);

  // 4. Sector grid lines
  drawSectorGrid(ctx, quadrants, zoom, offsetX, offsetY, W, H);

  // 5. 1-ly grid lines (zoom-gated)
  drawLyGrid(ctx, quadrants, zoom, offsetX, offsetY, W, H);

  // 6. Sector name labels (zoom-gated)
  drawSectorLabels(ctx, sectors, zoom, offsetX, offsetY, W, H);
}