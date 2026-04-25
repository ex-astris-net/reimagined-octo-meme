// data.js
// Fetches data from Lambda, normalises it, and attaches galaxy coords.
// Returns a plain object; does NOT write to state (that's main.js's job).

import { LAMBDA_URL, FETCH_RETRIES, FETCH_RETRY_DELAY } from './config.js';
import { toGalaxyLY, indexToGrid } from './coords.js';

// ── Internal helpers ─────────────────────────────────────────────────────────

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = FETCH_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`[data] fetch attempt ${attempt} failed, retrying…`, err.message);
      await delay(FETCH_RETRY_DELAY);
    }
  }
}

// ── Normalisers ──────────────────────────────────────────────────────────────

/**
 * The Lambda returns { quadrants, sectors, systems }.
 * Each quadrant: { id, name, width, height }
 * Each sector:   { id, name, quadrantId, index }  (a/b may be pre-computed by Lambda)
 * Each system:   { id, name, sectorId, quadrantName, a, b, x, y, type, url, faction }
 *
 * We attach gx/gy to every system here.
 */
function normaliseSystems(systems) {
  return systems.map(sys => {
    let gx, gy;
    try {
      ({ gx, gy } = toGalaxyLY(sys.quadrantName, sys.a, sys.b, sys.x, sys.y));
    } catch (e) {
      console.warn(`[data] skipping system "${sys.name}": ${e.message}`);
      gx = 0; gy = 0;
    }
    return { ...sys, gx, gy };
  });
}

/**
 * If the Lambda doesn't pre-compute a/b on sectors, do it client-side.
 * Requires quadrants array for width lookup.
 */
function normaliseSectors(sectors, quadrants) {
  const widthById = Object.fromEntries(quadrants.map(q => [q.id, q.width]));
  return sectors.map(sec => {
    if (sec.a !== undefined) return sec; // already done server-side
    const width = widthById[sec.quadrantId] ?? 1;
    const { a, b } = indexToGrid(sec.index, width);
    return { ...sec, a, b };
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Load all map data.
 * @returns {{ quadrants, sectors, systems }}
 * @throws on unrecoverable fetch failure
 */
export async function loadData() {
  const raw = await fetchWithRetry(LAMBDA_URL);
  const quadrants = raw.quadrants ?? [];
  const sectors   = normaliseSectors(raw.sectors ?? [], quadrants);
  const systems   = normaliseSystems(raw.systems ?? []);

  return { quadrants, sectors, systems };
}