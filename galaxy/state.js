// state.js
// Central mutable state. Import `state` everywhere; never duplicate fields.
// All mutations go through the setter functions so call-sites are searchable.

const _state = {
  // ── Viewport ─────────────────────────────────────────────────────────────
  zoom:    1,
  offsetX: 0,
  offsetY: 0,

  // ── Data ─────────────────────────────────────────────────────────────────
  quadrants:       [],
  sectors:         [],
  systems:         [],
  starships:       [],   // raw starship records from API
  positionedShips: [],   // enriched ships with gx/gy resolved from route docs

  // ── UI ────────────────────────────────────────────────────────────────────
  selectedSystemId: null,
  hoveredSystemId:  null,
  selectedShipId:   null,
  hoveredShipId:    null,
  dataLoaded:       false,
  loadError:        null,

  // ── Controls ─────────────────────────────────────────────────────────────
  searchQuery:  '',
  colorMode:    'type',
  showNonCanon: true,
};

// ── Viewport ────────────────────────────────────────────────────────────────
export function getViewport()         { return { zoom: _state.zoom, offsetX: _state.offsetX, offsetY: _state.offsetY }; }
export function setZoom(z)            { _state.zoom    = z; }
export function setOffset(x, y)       { _state.offsetX = x; _state.offsetY = y; }

// ── Data ────────────────────────────────────────────────────────────────────
export function getData()             { return { quadrants: _state.quadrants, sectors: _state.sectors, systems: _state.systems }; }
export function setData({ quadrants, sectors, systems }) {
  _state.quadrants  = quadrants;
  _state.sectors    = sectors;
  _state.systems    = systems;
  _state.dataLoaded = true;
}
export function isDataLoaded()        { return _state.dataLoaded; }
export function setLoadError(msg)     { _state.loadError = msg; }
export function getLoadError()        { return _state.loadError; }

// ── Starships ────────────────────────────────────────────────────────────────
export function getStarships()            { return _state.starships; }
export function setStarships(ships)       { _state.starships = ships; }
export function getPositionedShips()      { return _state.positionedShips; }
export function setPositionedShips(ships) { _state.positionedShips = ships; }

// ── System selection / hover ─────────────────────────────────────────────────
export function getSelectedId()       { return _state.selectedSystemId; }
export function setSelectedId(id)     { _state.selectedSystemId = id; }
export function getHoveredId()        { return _state.hoveredSystemId; }
export function setHoveredId(id)      { _state.hoveredSystemId = id; }

// ── Ship selection / hover ───────────────────────────────────────────────────
export function getSelectedShipId()   { return _state.selectedShipId; }
export function setSelectedShipId(id) { _state.selectedShipId = id; }
export function getHoveredShipId()    { return _state.hoveredShipId; }
export function setHoveredShipId(id)  { _state.hoveredShipId = id; }

// ── Controls ────────────────────────────────────────────────────────────────
export function getSearchQuery()      { return _state.searchQuery; }
export function setSearchQuery(q)     { _state.searchQuery = q; }
export function getColorMode()        { return _state.colorMode; }
export function setColorMode(m)       { _state.colorMode = m; }
export function getShowNonCanon()     { return _state.showNonCanon; }
export function setShowNonCanon(v)    { _state.showNonCanon = v; }

// ── Convenience ──────────────────────────────────────────────────────────────
export function getSelectedSystem() {
  if (!_state.selectedSystemId) return null;
  return _state.systems.find(s => s.id === _state.selectedSystemId) ?? null;
}