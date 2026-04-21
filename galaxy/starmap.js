// ============================================================
// CONFIG — swap these for your actual values
// ============================================================
const AIRTABLE_TOKEN = 'patIxnwrFf5hS62xH.8f2cb7ca190b57e4be3cf26800e66f2ca220b5390dc0ea3fc90860c164b3bc38';
const AIRTABLE_BASE  = 'appKRq1KgOjEkqNBe';

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
// AIRTABLE
// ============================================================
async function airtableFetch(table, params = {}) {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
  });
  if (!resp.ok) throw new Error(`Airtable error ${resp.status} on table "${table}"`);
  return resp.json();
}

async function fetchAll(table, params = {}) {
  const records = [];
  let offset = null;
  do {
    const p = { ...params };
    if (offset) p.offset = offset;
    const data = await airtableFetch(table, p);
    records.push(...data.records);
    offset = data.offset ?? null;
  } while (offset);
  return records;
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
// DATA LOADING
// ============================================================
async function loadData() {
  // Quadrants
  const qRecs = await fetchAll(TABLES.quadrants);
  state.quadrants = qRecs.map(r => ({
    id:     r.id,
    name:   r.fields['Name'],
    width:  r.fields['Width']  ?? 6,
    height: r.fields['Height'] ?? 6,
  }));

  // Sectors — Quadrant field is a linked record array
  const sRecs = await fetchAll(TABLES.sectors);
  state.sectors = sRecs.map(r => {
    const qId   = Array.isArray(r.fields['Quadrant']) ? r.fields['Quadrant'][0] : r.fields['Quadrant'];
    const quad  = state.quadrants.find(q => q.id === qId);
    const index = r.fields['Index'] ?? 0;
    const width = quad?.width ?? 1;
    return {
        id:           r.id,
        name:         r.fields['Name'],
        quadrantId:   qId,
        quadrantName: quad?.name ?? 'Unknown',
        a:            index % width,
        b:            Math.floor(index / width),
    };
  });

  // Systems — Sector field is a linked record array
  const syRecs = await fetchAll(TABLES.systems);
  state.systems = syRecs.map(r => {
    const secId = Array.isArray(r.fields['Sector']) ? r.fields['Sector'][0] : r.fields['Sector'];
    const sec   = state.sectors.find(s => s.id === secId);
    const x     = r.fields['X'] ?? 0;
    const y     = r.fields['Y'] ?? 0;
    const { gx, gy } = sec
      ? toGalaxyLY(sec.quadrantName, sec.a, sec.b, x, y)
      : { gx: 0, gy: 0 };
    return {
      id:           r.id,
      name:         r.fields['Name'],
      sectorId:     secId,
      sectorName:   sec?.name        ?? 'Unknown',
      quadrantName: sec?.quadrantName ?? 'Unknown',
      x, y,
      class:        r.fields['Class'] ?? '',
      notes:        r.fields['Notes'] ?? '',
      gx, gy,
      url:          r.fields['Url'] ?? '',
    };
  });
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

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('r', '6');
    glow.setAttribute('fill', 'rgba(160,212,255,0.08)');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r',    isSelected ? '4' : '2.5');
    dot.setAttribute('fill', isSelected ? '#ffffff' : 'var(--system-dot)');
    dot.setAttribute('class', 'dot');

    g.appendChild(glow);
    g.appendChild(dot);

    if (showLabels) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const systemLabelSize = Math.min(18, pxPerLY * 1.2);
      label.setAttribute('font-size', systemLabelSize);
      label.setAttribute('class', 'system-label');
      label.setAttribute('y', '7');
      label.textContent = sys.name;
      g.appendChild(label);
    }

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
    ['Sector',      sys.sectorName],
    ['Quadrant',    sys.quadrantName],
    ['Class',       sys.class || '—'],
    ['Notes',       sys.notes || '—'],
    ['Url',         sys.url ? `<a href="${sys.url}" target="_blank">Datalink</a>` : '—'],
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
    state.panX = state.dragStartPanX + (e.clientX - state.dragStartX);
    state.panY = state.dragStartPanY + (e.clientY - state.dragStartY);
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