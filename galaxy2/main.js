// main.js
// Entry point. Wires modules together; owns the render loop.
// No rendering or data logic lives here — only orchestration.

import { loadData }                          from './data.js';
import { setData, setLoadError, getViewport,
         setSelectedId, getSelectedId }       from './state.js';
import { drawGrid }                           from './grid.js';
import { initMarkerGroups, drawMarkers }      from './markers.js';
import { initViewport }                       from './viewport.js';
import { showLoading, hideLoading, showError,
         showInfoPanel, hideInfoPanel,
         initLegend }                         from './ui.js';

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas    = document.getElementById('grid-canvas');
const ctx       = canvas.getContext('2d');
const svg       = document.getElementById('marker-svg');
const legendEl  = document.getElementById('legend');
const container = document.getElementById('map-container');

// ── Resize handling ───────────────────────────────────────────────────────────
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w   = container.clientWidth;
  const h   = container.clientHeight;

  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';

  // SVG lives in CSS pixels — no DPR scaling needed
  svg.setAttribute('width',  w);
  svg.setAttribute('height', h);

  // Scale all canvas drawing to match physical pixels
  ctx.scale(dpr, dpr);
  redraw();
}

window.addEventListener('resize', resizeCanvas);

// ── Render loop ───────────────────────────────────────────────────────────────
let markerGroup, labelGroup;

function redraw() {
  const viewport = getViewport();
  drawGrid(ctx, viewport);
  if (markerGroup && labelGroup) {
    drawMarkers(markerGroup, labelGroup, viewport);
  }
}

// ── Interaction callbacks ─────────────────────────────────────────────────────
function onSystemClick(id) {
  setSelectedId(id);
  if (id) {
    showInfoPanel(() => {
      setSelectedId(null);
      hideInfoPanel();
      redraw();
    });
  } else {
    hideInfoPanel();
  }
  redraw();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  // 1. Size canvas to container
  resizeCanvas();

  // 2. Init SVG marker groups
  ({ markerGroup, labelGroup } = initMarkerGroups(svg));

  // 3. Init legend
  initLegend(legendEl);

  // 4. Attach viewport controls
  initViewport(container, redraw, onSystemClick);

  // 5. Load data
  showLoading();
  try {
    const data = await loadData();
    setData(data);
    hideLoading();
    redraw();
  } catch (err) {
    setLoadError(err.message);
    hideLoading();
    showError(`Failed to load map data: ${err.message}`);
    console.error('[main] load failed', err);
  }
}

init();