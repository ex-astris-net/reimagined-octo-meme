// state.js
// Central mutable state. Import `state` everywhere; never duplicate fields.
// All mutations go through the setter functions so call-sites are searchable.

const _state = {
  // ── Viewport ─────────────────────────────────────────────────────────────
  zoom:    1,       // current zoom multiplier
  offsetX: 0,      // canvas pan offset in pixels (screen coords)
  offsetY: 0,

  // ── Data ─────────────────────────────────────────────────────────────────
  quadrants: [],   // raw quadrant records from API
  sectors:   [],   // raw sector records from API
  systems:   [],   // processed system records (with gx, gy attached)

  // ── UI ────────────────────────────────────────────────────────────────────
  selectedSystemId: null,   // Airtable record ID of clicked system, or null
  hoveredSystemId:  null,   // record ID under cursor, or null
  dataLoaded:       false,
  loadError:        null,   // string | null
};

// ── Viewport ────────────────────────────────────────────────────────────────
export function getViewport()         { return { zoom: _state.zoom, offsetX: _state.offsetX, offsetY: _state.offsetY }; }
export function setZoom(z)            { _state.zoom    = z; }
export function setOffset(x, y)       { _state.offsetX = x; _state.offsetY = y; }

// ── Data ────────────────────────────────────────────────────────────────────
export function getData()             { return { quadrants: _state.quadrants, sectors: _state.sectors, systems: _state.systems }; }
export function setData({ quadrants, sectors, systems }) {
  _state.quadrants = quadrants;
  _state.sectors   = sectors;
  _state.systems   = systems;
  _state.dataLoaded = true;
}
export function isDataLoaded()        { return _state.dataLoaded; }
export function setLoadError(msg)     { _state.loadError = msg; }
export function getLoadError()        { return _state.loadError; }

// ── Selection / hover ────────────────────────────────────────────────────────
export function getSelectedId()       { return _state.selectedSystemId; }
export function setSelectedId(id)     { _state.selectedSystemId = id; }
export function getHoveredId()        { return _state.hoveredSystemId; }
export function setHoveredId(id)      { _state.hoveredSystemId = id; }

// ── Convenience ──────────────────────────────────────────────────────────────
/** Return the full system record for the currently selected ID, or null. */
export function getSelectedSystem() {
  if (!_state.selectedSystemId) return null;
  return _state.systems.find(s => s.id === _state.selectedSystemId) ?? null;
}