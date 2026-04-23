// ============================================================
// CONFIG — swap these for your actual values
// ============================================================
const LAMBDA_URL = 'https://9xo769s5o3.execute-api.us-west-2.amazonaws.com/default/galaxy-map-airtable';

const TABLES = {
  quadrants: 'quadrants',  // fields: Name, Width, Height
  sectors:   'sectors',    // fields: Name, Quadrant (linked), A, B
  systems:   'systems',    // fields: Name, Sector (linked), X, Y, Class, Notes
};

// ============================================================
// QUADRANT LAYOUT
// Each quadrant has an origin offset (ox, oy) in sector units
// on the unified galaxy canvas. Adjust to match your STO layout.
// ============================================================
const QUADRANT_LAYOUT = {
  'Alpha': { ox: 0,  oy: 0,  color: '#e8a020' },
  'Beta':  { ox: 5,  oy: 2,  color: '#3a8fd4' },
  'Gamma': { ox: 0,  oy: -5, color: '#9b4fd4' },
  'Delta': { ox: 7,  oy: -5, color: '#d44f6a' },
};

// px per lightyear at zoom = 1
const BASE_PX_PER_LY = 8;

// ============================================================
// STATE
// ============================================================
const state = {
  quadrants: [],  // { id, name, width, height }
  sectors:   [],  // { id, name, quadrantId, quadrantName, a, b }
  systems:   [],  // { id, name, sectorId, sectorName, quadrantName, x, y, class, notes, gx, gy }

  zoom:  1,
  panX:  0,
  panY:  0,

  dragging:      false,
  dragStartX:    0,
  dragStartY:    0,
  dragStartPanX: 0,
  dragStartPanY: 0,

  selectedSystem: null,
};

// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {
  const resp = await fetch(LAMBDA_URL);
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const { quadrants, sectors, systems } = await resp.json();

  state.quadrants = quadrants;
  state.sectors   = sectors;
  state.systems   = systems.map(sys => ({
    ...sys,
    ...toGalaxyLY(sys.quadrantName, sys.a, sys.b, sys.x, sys.y),
  }));
}

// ============================================================
// COORDINATE HELPERS
// ============================================================

// (quadrantName, sectorA, sectorB, systemX, systemY) → galaxy lightyears
function toGalaxyLY(quadrantName, sectorA, sectorB, sysX = 0, sysY = 0) {
  const layout = QUADRANT_LAYOUT[quadrantName];
  if (!layout) return { gx: 0, gy: 0 };
  return {
    gx: (layout.ox + sectorA) * 20 + sysX,
    gy: (layout.oy + sectorB) * 20 + sysY,
  };
}

// Galaxy lightyears → canvas pixel
function lyToCanvas(gx, gy) {
  return {
    cx: gx * BASE_PX_PER_LY * state.zoom + state.panX,
    cy: gy * BASE_PX_PER_LY * state.zoom + state.panY,
  };
}

// Canvas pixel → galaxy lightyears
function canvasToLY(cx, cy) {
  return {
    gx: (cx - state.panX) / (BASE_PX_PER_LY * state.zoom),
    gy: (cy - state.panY) / (BASE_PX_PER_LY * state.zoom),
  };
}

// ============================================================
// CANVAS — grid & quadrant fills
// ============================================================
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawGrid() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const pxPerLY     = BASE_PX_PER_LY * state.zoom;
  const pxPerSector = pxPerLY * 20;

  const topLeft     = canvasToLY(0, 0);
  const bottomRight = canvasToLY(w, h);
  const lyX0 = Math.floor(topLeft.gx)    - 1;
  const lyX1 = Math.ceil(bottomRight.gx) + 1;
  const lyY0 = Math.floor(topLeft.gy)    - 1;
  const lyY1 = Math.ceil(bottomRight.gy) + 1;

  // Quadrant region fills + borders + labels
  state.quadrants.forEach(q => {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) return;

    const x0 = layout.ox * 20;
    const y0 = layout.oy * 20;
    const x1 = x0 + q.width  * 20;
    const y1 = y0 + q.height * 20;
    const { cx: px0, cy: py0 } = lyToCanvas(x0, y0);
    const { cx: px1, cy: py1 } = lyToCanvas(x1, y1);

    ctx.fillStyle = layout.color + '08';
    ctx.fillRect(px0, py0, px1 - px0, py1 - py0);

    ctx.strokeStyle = layout.color + '30';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(px0, py0, px1 - px0, py1 - py0);

    // Quadrant label — scales with zoom, fades when zoomed in
    const labelAlpha = Math.max(0, Math.min(0.15, 0.35 - (state.zoom - 1.5) * 0.2));
    if (labelAlpha > 0.01) {
      ctx.fillStyle    = layout.color + Math.round(labelAlpha * 255).toString(16).padStart(2, '0');
      ctx.font         = `700 ${Math.max(12, pxPerSector * 0.3)}px 'Orbitron', sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(q.name.toUpperCase() + ' QUADRANT', (px0 + px1) / 2, (py0 + py1) / 2);
    }
  });

  // Sector grid lines (every 20 LY)
  const secX0 = Math.floor(lyX0 / 20) * 20;
  const secY0 = Math.floor(lyY0 / 20) * 20;

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth   = 0.5;

  for (let gx = secX0; gx <= lyX1; gx += 20) {
    const { cx } = lyToCanvas(gx, 0);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  }
  for (let gy = secY0; gy <= lyY1; gy += 20) {
    const { cy } = lyToCanvas(0, gy);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  }

  // 1 LY gridlines — fade in when zoomed in
  if (pxPerLY > 12) {
    const alpha = Math.min(0.06, (pxPerLY - 12) / 100);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth   = 0.5;

    for (let gx = lyX0; gx <= lyX1; gx++) {
      if (gx % 20 === 0) continue;
      const { cx } = lyToCanvas(gx, 0);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    }
    for (let gy = lyY0; gy <= lyY1; gy++) {
      if (gy % 20 === 0) continue;
      const { cy } = lyToCanvas(0, gy);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    }
  }

  // Sector name labels — appear when zoomed in enough
  if (pxPerSector > 60) {
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    
    const sectorLabelSize = Math.min(24, pxPerSector * 0.08);
    ctx.font = `${sectorLabelSize}px 'Lekton', monospace`;

    state.sectors.forEach(sec => {
      const layout = QUADRANT_LAYOUT[sec.quadrantName];
      if (!layout) return;
      const { cx, cy } = lyToCanvas((layout.ox + sec.a) * 20 + 0.5, (layout.oy + sec.b) * 20 + 0.5);
      ctx.fillStyle = layout.color + '99';
      ctx.fillText(sec.name.toUpperCase(), cx, cy);
    });
  }
}

// ============================================================
// SVG OVERLAY — system markers
// ============================================================
const svg = document.getElementById('svg-overlay');

function renderSystems() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const pxPerLY = BASE_PX_PER_LY * state.zoom;
  const showLabels = pxPerLY > 6;

  svg.setAttribute('width',  canvas.width);
  svg.setAttribute('height', canvas.height);

  state.systems.forEach(sys => {
    const { cx, cy } = lyToCanvas(sys.gx, sys.gy);
    if (cx < -20 || cx > canvas.width + 20 || cy < -20 || cy > canvas.height + 20) return;

    const isSelected = state.selectedSystem?.id === sys.id;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'system-marker');
    g.setAttribute('transform', `translate(${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    g.dataset.id = sys.id;

    const baseSize = Math.min(12, pxPerLY * 0.4);
    const size = isSelected ? baseSize * 1.5 : baseSize;

    if (sys.type === 'Star System') {
      // Diamond
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      shape.setAttribute('points', `0,${-size} ${size},0 0,${size} ${-size},0`);
      shape.setAttribute('fill', isSelected ? '#ffffff' : 'var(--system-dot)');
      shape.setAttribute('class', 'dot');
      g.appendChild(shape);

    } else if (sys.type === 'Facility') {
      // Downward triangle
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      shape.setAttribute('points', `0,${size} ${-size},${-size} ${size},${-size}`);
      shape.setAttribute('fill', isSelected ? '#838282' : 'var(--system-dot)');
      shape.setAttribute('class', 'dot');
      g.appendChild(shape);

    } else {
      // Square (POI and fallback)
      const shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      shape.setAttribute('x', -size);
      shape.setAttribute('y', -size);
      shape.setAttribute('width', size * 2);
      shape.setAttribute('height', size * 2);
      shape.setAttribute('fill', isSelected ? '#ffffff' : 'var(--system-dot)');
      shape.setAttribute('class', 'dot');
      g.appendChild(shape);
    }

    g.addEventListener('mouseenter', () => {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const labelSize = Math.min(18, BASE_PX_PER_LY * state.zoom * 1.2);
      
      label.setAttribute('class', 'system-label');
      label.setAttribute('x', '0');
      label.setAttribute('y', String(-(baseSize + labelSize + 5)));
      label.setAttribute('text-anchor', 'middle');
      label.removeAttribute('dominant-baseline');
      label.removeAttribute('alignment-baseline');
      label.setAttribute('font-size', Math.min(18, BASE_PX_PER_LY * state.zoom * 1.2));
      label.textContent = sys.name;
      g.appendChild(label);
    });

    g.addEventListener('mouseleave', () => {
      const label = g.querySelector('text');
      if (label) g.removeChild(label);
    });

    g.addEventListener('click', () => selectSystem(sys));
    svg.appendChild(g);
  });
}

function render() {
  drawGrid();
  renderSystems();
}

// ============================================================
// SYSTEM SELECTION
// ============================================================
function selectSystem(sys) {
  state.selectedSystem = sys;

  document.getElementById('info-panel-title').textContent = sys.name;

  const body = document.getElementById('info-panel-body');
  body.innerHTML = '';

  [
    ['Quadrant',    sys.quadrantName],
    ['Sector',      sys.sectorName],
    ['Faction',     sys.faction || '—'],
    ['Datafile',    sys.url ? `<a href="${sys.url}" target="_blank">${new URL(sys.url).hostname.replace(/^www\./, '')}</a>` : '—'],
  ].forEach(([label, value]) => {
    
    const row = document.createElement('div');
    row.className = 'info-row';
    row.innerHTML = `<div class="info-label">${label}</div><div class="info-value">${value}</div>`;
    body.appendChild(row);
  });

  document.getElementById('info-panel').classList.add('visible');
  render();
}

document.getElementById('info-panel-close').addEventListener('click', () => {
  state.selectedSystem = null;
  document.getElementById('info-panel').classList.remove('visible');
  render();
});

// ============================================================
// PAN & ZOOM
// ============================================================
const mapContainer = document.getElementById('map-container');

mapContainer.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  state.dragging      = true;
  state.dragStartX    = e.clientX;
  state.dragStartY    = e.clientY;
  state.dragStartPanX = state.panX;
  state.dragStartPanY = state.panY;
  mapContainer.classList.add('grabbing');
});

window.addEventListener('mousemove', e => {
  if (state.dragging) {
    const dx = e.clientX - state.dragStartX;
    const dy = e.clientY - state.dragStartY;
    if (Math.hypot(dx, dy) < 4) return; // threshold in px
    state.panX = state.dragStartPanX + dx;
    state.panY = state.dragStartPanY + dy;
    render();
  }
});

window.addEventListener('mouseup', () => {
  state.dragging = false;
  mapContainer.classList.remove('grabbing');
});

mapContainer.addEventListener('wheel', e => {
  e.preventDefault();
  const factor  = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  applyZoom(factor, e.clientX, e.clientY);
}, { passive: false });

function applyZoom(factor, cx, cy) {
  const newZoom = Math.max(0.15, Math.min(40, state.zoom * factor));
  state.panX = cx - (cx - state.panX) * (newZoom / state.zoom);
  state.panY = cy - (cy - state.panY) * (newZoom / state.zoom);
  state.zoom = newZoom;
  render();
}

document.getElementById('btn-zoom-in') .addEventListener('click', () => applyZoom(1.4,     canvas.width / 2, canvas.height / 2));
document.getElementById('btn-zoom-out').addEventListener('click', () => applyZoom(1 / 1.4, canvas.width / 2, canvas.height / 2));
document.getElementById('btn-zoom-fit').addEventListener('click', fitView);

// Touch
let lastTouchDist = null;

mapContainer.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  state.dragging      = true;
  state.dragStartX    = e.touches[0].clientX;
  state.dragStartY    = e.touches[0].clientY;
  state.dragStartPanX = state.panX;
  state.dragStartPanY = state.panY;
}, { passive: true });

mapContainer.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && state.dragging) {
    state.panX = state.dragStartPanX + (e.touches[0].clientX - state.dragStartX);
    state.panY = state.dragStartPanY + (e.touches[0].clientY - state.dragStartY);
    render();
  } else if (e.touches.length === 2) {
    const dx   = e.touches[0].clientX - e.touches[1].clientX;
    const dy   = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (lastTouchDist !== null) {
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyZoom(dist / lastTouchDist, cx, cy);
    }
    lastTouchDist = dist;
  }
}, { passive: true });

mapContainer.addEventListener('touchend', () => {
  state.dragging = false;
  lastTouchDist  = null;
});

// ============================================================
// FIT VIEW
// ============================================================
function fitView() {
  if (!state.quadrants.length) {
    state.zoom = 1;
    state.panX = canvas.width  / 2;
    state.panY = canvas.height / 2;
    render();
    return;
  }

  let minGX = Infinity, maxGX = -Infinity;
  let minGY = Infinity, maxGY = -Infinity;

  state.quadrants.forEach(q => {
    const layout = QUADRANT_LAYOUT[q.name];
    if (!layout) return;
    const x0 = layout.ox * 20, y0 = layout.oy * 20;
    const x1 = x0 + q.width * 20, y1 = y0 + q.height * 20;
    minGX = Math.min(minGX, x0); maxGX = Math.max(maxGX, x1);
    minGY = Math.min(minGY, y0); maxGY = Math.max(maxGY, y1);
  });

  const pad    = 40;
  const scaleX = (canvas.width  - pad * 2) / ((maxGX - minGX) * BASE_PX_PER_LY);
  const scaleY = (canvas.height - pad * 2) / ((maxGY - minGY) * BASE_PX_PER_LY);
  state.zoom   = Math.min(scaleX, scaleY);
  state.panX   = pad - minGX * BASE_PX_PER_LY * state.zoom;
  state.panY   = pad - minGY * BASE_PX_PER_LY * state.zoom;
  render();
}

// ============================================================
// INIT
// ============================================================
async function init() {
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); render(); });

  try {
    await loadData();
  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('loading-text').textContent = 'Error loading data — check console';
    return;
  }

  fitView();

  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => loading.remove(), 500);
}

init();