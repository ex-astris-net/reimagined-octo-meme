// markers.js
// Manages the SVG overlay: marker shapes (markerGroup) and labels (labelGroup).
// markerGroup is appended first so labels always render on top.

import {
  SYSTEM_TYPES, MARKER_BASE_SIZE, MARKER_MAX_PX,
  LABEL_BASE_SIZE, LABEL_MAX_PX, LABEL_BG_FILL, LABEL_BG_STROKE,
  LABEL_ACTIVE_FILL, LABEL_ACTIVE_STROKE, FONT_LABEL, BASE_PX_PER_LY,
  FACTION_COLORS, FACTION_COLOR_DEFAULT, TYPE_COLORS, TYPE_COLOR_DEFAULT,
} from './config.js';
import { galaxyToScreen } from './coords.js';
import { getData, getSelectedId, getHoveredId, getSearchQuery, getColorMode, getShowNonCanon } from './state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const LABEL_ALWAYS_ZOOM = 3;
const HITBOX_SIZE       = 18;

// ── SVG helpers ───────────────────────────────────────────────────────────────

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// ── Shape builders ────────────────────────────────────────────────────────────

function makeStar(size, fill, stroke) {
  const inset = 0.38;
  const c = size * inset;
  const d = `M 0,${-size} C ${c},${-c} ${c},${-c} ${size},0 C ${c},${c} ${c},${c} 0,${size} C ${-c},${c} ${-c},${c} ${-size},0 C ${-c},${-c} ${-c},${-c} 0,${-size} Z`;
  return svgEl('path', { d, fill, stroke, 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
}

function makeCircle(size, fill, stroke) {
  return svgEl('circle', { cx: 0, cy: 0, r: size, fill, stroke, 'stroke-width': 1.5 });
}

function makeTriangle(size, fill, stroke) {
  return svgEl('polygon', {
    points: `0,${size} ${-size},${-size} ${size},${-size}`,
    fill, stroke, 'stroke-width': 1.5,
  });
}

function makeSquare(size, fill, stroke) {
  return svgEl('rect', {
    x: -size, y: -size, width: size * 2, height: size * 2,
    fill, stroke, 'stroke-width': 1.5,
  });
}

const SHAPE_BUILDERS = {
  star:     makeStar,
  diamond:  makeStar,
  circle:   makeCircle,
  triangle: makeTriangle,
  square:   makeSquare,
};

// ── Color resolution ──────────────────────────────────────────────────────────

function resolveColor(sys, colorMode) {
  if (colorMode === 'faction') {
    return FACTION_COLORS[sys.faction] ?? FACTION_COLOR_DEFAULT;
  }
  return TYPE_COLORS[sys.type] ?? TYPE_COLOR_DEFAULT;
}

function colorFill(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ── Size helpers ──────────────────────────────────────────────────────────────

function markerSize(zoom) {
  return Math.min(MARKER_BASE_SIZE * zoom, MARKER_MAX_PX);
}

function labelSize(zoom) {
  const MIN_SIZE = 12, MAX_SIZE = 18;
  const t = Math.max(0, zoom - LABEL_ALWAYS_ZOOM);
  return Math.min(MIN_SIZE + Math.sqrt(t) * 2.5, MAX_SIZE);
}

// ── Callout label constants ───────────────────────────────────────────────────

const LABEL_PAD_X    = 6;
const LABEL_PAD_Y    = 4;
const LABEL_OFFSET_X = 45;
const LABEL_OFFSET_Y = 30;
const LABEL_CH_WIDTH = 0.56;

const QUADRANT_PRIORITY = [
  {  dirX:  1, dirY:  1 },
  {  dirX: -1, dirY:  1 },
  {  dirX:  1, dirY: -1 },
  {  dirX: -1, dirY: -1 },
];

// ── Builders ──────────────────────────────────────────────────────────────────

function buildMarker(sys, sx, sy, zoom, isSelected, isHovered, accentColor, dimmed) {
  const shape   = SYSTEM_TYPES[sys.type] ?? 'diamond';
  const builder = SHAPE_BUILDERS[shape] ?? makeStar;
  const size    = markerSize(zoom);
  const active  = isSelected || isHovered;

  const fill   = active ? LABEL_ACTIVE_FILL   : colorFill(accentColor, dimmed ? 0.12 : 0.25);
  const stroke = active ? LABEL_ACTIVE_STROKE : dimmed ? colorFill(accentColor, 0.25) : accentColor;

  const g = svgEl('g', {
    transform: `translate(${sx},${sy})`,
    'data-marker-id': sys.id,
    style: 'pointer-events: all; cursor: pointer;',
  });

  g.appendChild(svgEl('rect', {
    x: -HITBOX_SIZE, y: -HITBOX_SIZE,
    width: HITBOX_SIZE * 2, height: HITBOX_SIZE * 2,
    fill: 'transparent', stroke: 'none',
  }));

  g.appendChild(builder(active ? size * 1.4 : size, fill, stroke));
  return g;
}

function buildLabel(sys, sx, sy, zoom, isSelected, isHovered, svgWidth, svgHeight, accentColor, dimmed, searchMatch) {
  const fontSize = labelSize(zoom);
  const visible  = isSelected || isHovered || zoom >= LABEL_ALWAYS_ZOOM || searchMatch;

  const textW = sys.name.length * fontSize * LABEL_CH_WIDTH;
  const textH = fontSize;
  const rectW = textW + LABEL_PAD_X * 2;
  const rectH = textH + LABEL_PAD_Y * 2;

  let dirX = 1, dirY = 1;
  for (const candidate of QUADRANT_PRIORITY) {
    const boxCX = sx + candidate.dirX * LABEL_OFFSET_X;
    const boxCY = sy + candidate.dirY * LABEL_OFFSET_Y;
    if (
      boxCX - rectW / 2 >= 0 && boxCX + rectW / 2 <= svgWidth &&
      boxCY - rectH / 2 >= 0 && boxCY + rectH / 2 <= svgHeight
    ) {
      dirX = candidate.dirX;
      dirY = candidate.dirY;
      break;
    }
  }

  const boxCX = sx + dirX * LABEL_OFFSET_X;
  const boxCY = sy + dirY * LABEL_OFFSET_Y;
  const rectX = boxCX - rectW / 2;
  const rectY = boxCY - rectH / 2;

  const g = svgEl('g', {
    'data-marker-id': sys.id,
    visibility: visible ? 'visible' : 'hidden',
  });

  const rectStroke = (isSelected || isHovered || searchMatch)
    ? accentColor
    : dimmed ? 'rgba(33,44,55,0.4)' : LABEL_BG_STROKE;
  const rectFill = (isSelected || isHovered || searchMatch)
    ? colorFill(accentColor, 0.15)
    : dimmed ? 'rgba(11,22,33,0.4)' : LABEL_BG_FILL;

  g.appendChild(svgEl('rect', {
    x: rectX, y: rectY, width: rectW, height: rectH,
    fill: rectFill, stroke: rectStroke,
    'stroke-width': (isSelected || isHovered || searchMatch) ? 1 : 0.75,
    rx: 2,
  }));

  const textFill = dimmed && !searchMatch && !isSelected && !isHovered
    ? 'rgba(200,216,232,0.3)'
    : (isSelected || isHovered || searchMatch) ? accentColor : '#c8d8e8';

  const text = svgEl('text', {
    x: boxCX, y: boxCY,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-family': FONT_LABEL,
    'font-size': fontSize,
    fill: textFill,
  });
  text.textContent = sys.name;
  g.appendChild(text);

  return g;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initMarkerGroups(svg) {
  const markerGroup = svgEl('g', { id: 'marker-group' });
  const labelGroup  = svgEl('g', { id: 'label-group'  });
  svg.appendChild(markerGroup);
  svg.appendChild(labelGroup);
  return { markerGroup, labelGroup };
}

export function drawMarkers(markerGroup, labelGroup, { zoom, offsetX, offsetY }) {
  markerGroup.innerHTML = '';
  labelGroup.innerHTML  = '';

  const { systems } = getData();
  if (!systems.length) return;

  const selectedId  = getSelectedId();
  const hoveredId   = getHoveredId();
  const searchQuery = getSearchQuery();
  const colorMode   = getColorMode();
  const hasSearch   = searchQuery.length > 0;
  const showNonCanon = getShowNonCanon();

  const W = markerGroup.ownerSVGElement?.clientWidth  ?? window.innerWidth;
  const H = markerGroup.ownerSVGElement?.clientHeight ?? window.innerHeight;

  for (const sys of systems) {
    const { sx, sy } = galaxyToScreen(sys.gx, sys.gy, zoom, offsetX, offsetY);
    if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;

    if (!showNonCanon && !sys.canon) continue;

    const isSelected  = sys.id === selectedId;
    const isHovered   = sys.id === hoveredId;
    const searchMatch = hasSearch && sys.name.toLowerCase().includes(searchQuery);
    const dimmed      = hasSearch && !searchMatch && !isSelected && !isHovered;
    const accentColor = resolveColor(sys, colorMode);

    markerGroup.appendChild(buildMarker(sys, sx, sy, zoom, isSelected, isHovered, accentColor, dimmed));
    labelGroup.appendChild( buildLabel( sys, sx, sy, zoom, isSelected, isHovered, W, H, accentColor, dimmed, searchMatch));
  }
}