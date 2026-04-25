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
const LABEL_ALWAYS_ZOOM = 3;
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

function labelSize(zoom) {
  return Math.min(LABEL_BASE_SIZE * (zoom / 2), LABEL_MAX_PX);
}

function buildMarker(sys, sx, sy, zoom, isSelected, isHovered) {
  const shape    = SYSTEM_TYPES[sys.type] ?? 'diamond';
  const builder  = SHAPE_BUILDERS[shape] ?? makeDiamond;
  const size     = markerSize(zoom);
  const active   = isSelected || isHovered;
  const fill     = active ? '#ffffff' : '#0a0a12';
  const stroke   = active ? '#ffffff' : '#c8d8e8';

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

function buildLabel(sys, sx, sy, zoom, isSelected, isHovered) {
  const size    = labelSize(zoom);
  const visible = isSelected || isHovered || zoom >= LABEL_ALWAYS_ZOOM;

  const text = svgEl('text', {
    x: sx,
    y: sy - markerSize(zoom) - size * 0.4,
    'text-anchor': 'middle',
    'dominant-baseline': 'auto',
    'font-family': FONT_LABEL,
    'font-size': size,
    fill: '#c8d8e8',
    stroke: '#0a0a12',
    'stroke-width': 3,
    'paint-order': 'stroke fill',
    'data-marker-id': sys.id,
    visibility: visible ? 'visible' : 'hidden',
  });
  text.textContent = sys.name;
  return text;
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
    labelGroup.appendChild( buildLabel( sys, sx, sy, zoom, isSelected, isHovered));
  }
}