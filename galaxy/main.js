// main.js
// Entry point. Wires modules together; owns the render loop.
// No rendering or data logic lives here — only orchestration.

import { loadData }                          from './data.js';
import { setData, setLoadError, getViewport,
         setSelectedId, getSelectedId,
         getSelectedSystem,
         setStarships, setPositionedShips,
         getPositionedShips,
         setSelectedShipId }                 from './state.js';
import { drawGrid }                           from './grid.js';
import { initMarkerGroups, drawMarkers }      from './markers.js';
import { initShipGroup, loadShipPositions,
         drawShips }                          from './ships.js';
import { initViewport }                       from './viewport.js';
import { initControls }                       from './controls.js';
import { showLoading, hideLoading, showError,
         showInfoPanel, hideInfoPanel,
         initLegend, renderLegend }           from './ui.js';

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

  svg.setAttribute('width',  w);
  svg.setAttribute('height', h);

  ctx.scale(dpr, dpr);
  redraw();
}

window.addEventListener('resize', resizeCanvas);

// ── Render loop ───────────────────────────────────────────────────────────────
let markerGroup, labelGroup, shipMarkerGroup, shipLabelGroup;

function redraw() {
  const viewport = getViewport();
  drawGrid(ctx, viewport);
  if (markerGroup && labelGroup) {
    drawMarkers(markerGroup, labelGroup, viewport);
  }
  if (shipMarkerGroup && shipLabelGroup) {
    drawShips(shipMarkerGroup, shipLabelGroup, getPositionedShips(), viewport);
  }
}

// ── Info panel helpers ────────────────────────────────────────────────────────

function systemRows(sys) {
  return [
    { label: 'Quadrant', value: sys.quadrantName },
    { label: 'Sector',   value: sys.sectorName   },
    { label: 'Coords',   value: `${sys.x}, ${sys.y}` },
    { label: 'Faction',  value: sys.faction       },
    { label: 'Datafile', value: sys.url           },
  ];
}

function shipRows(ship) {
  const pos = ship.position;
  let position = '—';
  if (pos) {
    position = pos.system
      ? `${pos.quadrant} / ${pos.sector} / ${pos.system}`
      : `${pos.quadrant} / ${pos.sector} / ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}`;
  }
  return [
    { label: 'Serial',   value: ship.serial    },
    { label: 'Class',    value: ship.shipClass  },
    { label: 'Faction',  value: ship.faction    },
    { label: 'Position', value: position        },
    { label: 'Info',     value: ship.infoUrl    },
    { label: 'Contact',  value: ship.contact    },
  ];
}

// ── Interaction callbacks ─────────────────────────────────────────────────────

function onSystemClick(id) {
  setSelectedId(id);
  setSelectedShipId(null); // deselect any ship
  if (id) {
    const sys = getSelectedSystem();
    if (!sys) return;
    showInfoPanel(sys.name, systemRows(sys), () => {
      setSelectedId(null);
      hideInfoPanel();
      redraw();
    });
  } else {
    hideInfoPanel();
  }
  redraw();
}

function onShipClick(ship) {
  setSelectedShipId(ship ? ship.id : null);
  setSelectedId(null); // deselect any system
  if (ship) {
    showInfoPanel(ship.name, shipRows(ship), () => {
      setSelectedShipId(null);
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
  resizeCanvas();

  ({ markerGroup, labelGroup } = initMarkerGroups(svg));
  ({ shipMarkerGroup, shipLabelGroup } = initShipGroup(svg));

  initLegend(legendEl);
  initViewport(container, redraw, onSystemClick, onShipClick);
  initControls(redraw, () => renderLegend(legendEl));

  showLoading();
  const MIN_LOADING_MS = 2500;
  try {
    const [data] = await Promise.all([
      loadData(),
      new Promise(resolve => setTimeout(resolve, MIN_LOADING_MS)),
    ]);
    console.log(data);

    setData(data);
    setStarships(data.starships);

    const positioned = await loadShipPositions();
    setPositionedShips(positioned);
    console.log(`[main] ${positioned.length} ship(s) positioned`);

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