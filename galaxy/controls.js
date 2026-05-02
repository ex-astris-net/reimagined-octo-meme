// controls.js
import { SECTOR_SIZE, QUADRANT_LAYOUT } from './config.js';
import { screenToGalaxy } from './coords.js';
import { setSearchQuery, setColorMode, getColorMode, setShowNonCanon, getData, getShowNonCanon, getViewport } from './state.js';

/**
 * @param {() => void} onRedraw
 * @param {() => void} onLegendChange
 */
export function initControls(onRedraw, onLegendChange) {
  const searchInput  = document.getElementById('ctrl-search');
  const radioButtons = document.querySelectorAll('input[name="color-mode"]');

  // ── Search ──────────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    setSearchQuery(searchInput.value.trim().toLowerCase());
    onRedraw();
  });

  document.getElementById('ctrl-search-clear').addEventListener('click', () => {
    searchInput.value = '';
    setSearchQuery('');
    onRedraw();
  });

  // ── Non-canon toggle ───────────────────────────────────────────────────────
  const nonCanonCheckbox = document.getElementById('ctrl-noncanon');
  nonCanonCheckbox.checked = getShowNonCanon();
  nonCanonCheckbox.addEventListener('change', () => {
    setShowNonCanon(nonCanonCheckbox.checked);
    onRedraw();
  });

  // ── Color mode ──────────────────────────────────────────────────────────────
  radioButtons.forEach(radio => {
    radio.checked = radio.value === getColorMode();
    radio.addEventListener('change', () => {
      if (radio.checked) {
        setColorMode(radio.value);
        onLegendChange();  // ← re-render legend
        onRedraw();
      }
    });
  });

  // ── Cursor position ─────────────────────────────────────────────────────────
  const cursorEl  = document.getElementById('ctrl-cursor');
  const mapContainer = document.getElementById('grid-canvas'); // ← svg, not map-container

  mapContainer.addEventListener('mousemove', (e) => {
    const rect = mapContainer.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { zoom, offsetX, offsetY } = getViewport();
    const { gx, gy } = screenToGalaxy(sx, sy, zoom, offsetX, offsetY);

    // Find which sector this galaxy position falls in
    const { sectors } = getData();
    const secA = Math.floor(gx / SECTOR_SIZE);
    const secB = Math.floor(gy / SECTOR_SIZE);

    const sector = sectors.find(sec => {
      const q = QUADRANT_LAYOUT[sec.quadrantName];
      if (!q) return false;
      return (q.ox + sec.a) === secA && (q.oy + sec.b) === secB;
    });

    const locX = ((gx % SECTOR_SIZE) + SECTOR_SIZE) % SECTOR_SIZE;
    const locY = ((gy % SECTOR_SIZE) + SECTOR_SIZE) % SECTOR_SIZE;

    cursorEl.textContent = sector
      ? `${sector.name}  /  ${locX.toFixed(2)}, ${locY.toFixed(2)}`
      : `—  /  —`;
  });

  mapContainer.addEventListener('mouseleave', () => {
    cursorEl.textContent = '—';
  });
}