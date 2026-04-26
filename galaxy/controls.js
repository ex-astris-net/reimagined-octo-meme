// controls.js
// Owns the control box UI: search input and color-mode radio.
// Writes to state, then calls onRedraw. No rendering logic here.

import { setSearchQuery, setColorMode, getColorMode, setShowNonCanon, getShowNonCanon } from './state.js';

/**
 * @param {() => void} onRedraw
 */
export function initControls(onRedraw) {
  const searchInput  = document.getElementById('ctrl-search');
  const radioButtons = document.querySelectorAll('input[name="color-mode"]');

  // ── Search ──────────────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    setSearchQuery(searchInput.value.trim().toLowerCase());
    onRedraw();
  });

  // Clear button
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
  // Set initial checked state to match state default
  radioButtons.forEach(radio => {
    radio.checked = radio.value === getColorMode();
    radio.addEventListener('change', () => {
      if (radio.checked) {
        setColorMode(radio.value);
        onRedraw();
      }
    });
  });
}