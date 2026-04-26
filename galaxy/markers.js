// markers.js
// Manages the SVG overlay: marker shapes (markerGroup) and labels (labelGroup).
// markerGroup is appended first so labels always render on top.

import {
  SYSTEM_TYPES, MARKER_BASE_SIZE, MARKER_MAX_PX,
  LABEL_BASE_SIZE, LABEL_MAX_PX, FONT_LABEL, BASE_PX_PER_LY,
} from './config.js';
import { galaxyToScreen, pxPerSector } from './coords.js';
import { getData, getSelectedId, getHoveredId } from './state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Labels always visible above this zoom level
const LABEL_ALWAYS_ZOOM = 5;
// Hitbox half-size in px (larger than visible marker for easier targeting)
const HITBOX_SIZE = 18;

// ── SVG helpers ───────────────────────────────────────────────────────────────

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── Shape builders ────────────────────────────────────────────────────────────
// Each returns an SVGElement centred at (0,0). Size is half-size in pixels.

function makeDiamond(size, fill, stroke) {
  // Rotated square → diamond
  return svgEl('polygon', {
    points: `0,${-size} ${size},0 0,${size} ${-size},0`,
    fill, stroke,
    'stroke-width': 1.5,
  });
}

function makeTriangle(size, fill, stroke) {
  // Downward-pointing triangle
  return svgEl('polygon', {
    points: `0,${size} ${-size},${-size} ${size},${-size}`,
    fill, stroke,
    'stroke-width': 1.5,
  });
}

function makeSquare(size, fill, stroke) {
  return svgEl('rect', {
    x: -size, y: -size,
    width: size * 2, height: size * 2,
    fill, stroke,
    'stroke-width': 1.5,
  });
}

const SHAPE_BUILDERS = {
  diamond:  makeDiamond,
  triangle: makeTriangle,
  square:   makeSquare,
};

// ── Marker + label factories ──────────────────────────────────────────────────

function markerSize(zoom) {
  return Math.min(MARKER_BASE_SIZE * zoom, MARKER_MAX_PX);
}

// Label font size: starts at 9px at LABEL_ALWAYS_ZOOM, grows slowly via sqrt, caps at 14px.
// Below LABEL_ALWAYS_ZOOM it only shows on hover/select — still use a readable minimum there.
function labelSize(zoom) {
  const MIN_SIZE = 12;
  const MAX_SIZE = 24;
  const t = Math.max(0, zoom - LABEL_ALWAYS_ZOOM);
  return Math.min(MIN_SIZE + Math.sqrt(t) * 2.5, MAX_SIZE);
}

function buildMarker(sys, sx, sy, zoom, isSelected, isHovered) {
  const shape    = SYSTEM_TYPES[sys.type] ?? 'diamond';
  const builder  = SHAPE_BUILDERS[shape] ?? makeDiamond;
  const size     = markerSize(zoom);
  const active   = isSelected || isHovered;
  const fill     = active ? '#00ff0040' : '#33669940';
  const stroke   = active ? '#00ff00' : '#336699';

  const g = svgEl('g', {
    transform: `translate(${sx},${sy})`,
    'data-marker-id': sys.id,
    style: 'pointer-events: all; cursor: pointer;',
  });

  // Invisible oversized hitbox (must be first child)
  g.appendChild(svgEl('rect', {
    x: -HITBOX_SIZE, y: -HITBOX_SIZE,
    width: HITBOX_SIZE * 2, height: HITBOX_SIZE * 2,
    fill: 'transparent',
    stroke: 'none',
  }));

  // Visible shape
  const shapeEl = builder(active ? size * 1.4 : size, fill, stroke);
  g.appendChild(shapeEl);

  return g;
}

// ── Callout label constants ───────────────────────────────────────────────────
const LABEL_PAD_X    = 6;
const LABEL_PAD_Y    = 4;
const LABEL_OFFSET_X = 45;  
const LABEL_OFFSET_Y = 30;  
const LABEL_CH_WIDTH = 0.56;

// Priority order: bottom-right, bottom-left, top-right, top-left
const QUADRANT_PRIORITY = [
  {  dirX:  1, dirY:  1 },
  {  dirX: -1, dirY:  1 },
  {  dirX:  1, dirY: -1 },
  {  dirX: -1, dirY: -1 },
];

function buildLabel(sys, sx, sy, zoom, isSelected, isHovered, svgWidth, svgHeight) {
  const fontSize = labelSize(zoom);
  const visible  = isSelected || isHovered || zoom >= LABEL_ALWAYS_ZOOM;
  const mSize    = markerSize(zoom);

  // Estimate box dimensions
  const textW = sys.name.length * fontSize * LABEL_CH_WIDTH;
  const textH = fontSize;
  const rectW = textW + LABEL_PAD_X * 2;
  const rectH = textH + LABEL_PAD_Y * 2;

  // ── Pick first quadrant where the box fits on screen ──────────────────────
  let dirX =  1, dirY = 1; // fallback: bottom-right
  for (const candidate of QUADRANT_PRIORITY) {
    const boxCX = sx + candidate.dirX * LABEL_OFFSET_X;
    const boxCY = sy + candidate.dirY * LABEL_OFFSET_Y;
    if (
      boxCX - rectW / 2 >= 0 &&
      boxCX + rectW / 2 <= svgWidth &&
      boxCY - rectH / 2 >= 0 &&
      boxCY + rectH / 2 <= svgHeight
    ) {
      dirX = candidate.dirX;
      dirY = candidate.dirY;
      break;
    }
  }

  // ── Box centre ─────────────────────────────────────────────────────────────
  const boxCX = sx + dirX * LABEL_OFFSET_X;
  const boxCY = sy + dirY * LABEL_OFFSET_Y;
  const rectX = boxCX - rectW / 2;
  const rectY = boxCY - rectH / 2;


  const g = svgEl('g', {
    'data-marker-id': sys.id,
    visibility: visible ? 'visible' : 'hidden',
  });

  g.appendChild(svgEl('rect', {
    x: rectX, y: rectY,
    width: rectW, height: rectH,
    fill: 'rgba(11,22,33,0.80)',
    stroke: 'rgba(33,44,55,0.80)',
    'stroke-width': 0.75,
    rx: 2,
  }));

  const text = svgEl('text', {
    x: boxCX,
    y: boxCY,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': FONT_LABEL,
    'font-size': fontSize,
    fill: '#c8d8e8',
  });
  text.textContent = sys.name;
  g.appendChild(text);

  return g;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialise the two SVG groups. Call once after DOM is ready.
 * @param {SVGElement} svg
 * @returns {{ markerGroup: SVGGElement, labelGroup: SVGGElement }}
 */
export function initMarkerGroups(svg) {
  const markerGroup = svgEl('g', { id: 'marker-group' });
  const labelGroup  = svgEl('g', { id: 'label-group'  });
  svg.appendChild(markerGroup);
  svg.appendChild(labelGroup);
  return { markerGroup, labelGroup };
}

/**
 * Re-render all markers and labels for the current viewport.
 * @param {SVGGElement} markerGroup
 * @param {SVGGElement} labelGroup
 * @param {{ zoom: number, offsetX: number, offsetY: number }} viewport
 */
export function drawMarkers(markerGroup, labelGroup, { zoom, offsetX, offsetY }) {
  // Clear previous frame
  markerGroup.innerHTML = '';
  labelGroup.innerHTML  = '';

  const { systems } = getData();
  if (!systems.length) return;

  const selectedId = getSelectedId();
  const hoveredId  = getHoveredId();

  const W = markerGroup.ownerSVGElement?.clientWidth  ?? window.innerWidth;
  const H = markerGroup.ownerSVGElement?.clientHeight ?? window.innerHeight;

  for (const sys of systems) {
    const { sx, sy } = galaxyToScreen(sys.gx, sys.gy, zoom, offsetX, offsetY);

    // Skip systems well off-screen (with generous margin for labels/hitboxes)
    if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;

    const isSelected = sys.id === selectedId;
    const isHovered  = sys.id === hoveredId;

    markerGroup.appendChild(buildMarker(sys, sx, sy, zoom, isSelected, isHovered));
    labelGroup.appendChild( buildLabel( sys, sx, sy, zoom, isSelected, isHovered, W, H));
  }
}