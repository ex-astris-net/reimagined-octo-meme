// data.js
// Fetches all map data from Google Sheets published CSVs and normalises it
// into the same shape the rest of the codebase expects.

import {
  SHEETS_QUADRANTS_URL,
  SHEETS_SECTORS_URL,
  SHEETS_SYSTEMS_URL,
  SHEETS_STARSHIPS_URL,
} from './config.js';
import { indexToGrid, toGalaxyLY } from './coords.js';

// ── CSV parser ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects keyed by the header row.
 * Handles quoted fields (including embedded commas and newlines).
 */
function parseCsv(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === '\n' && !inQuote) {
      lines.push(cur);
      cur = '';
    } else if (ch === '\r' && !inQuote) {
      // skip bare \r
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);

  if (lines.length < 1) return [];

  const headers = splitRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitRow(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] ?? '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function splitRow(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ── Fetch helper ───────────────────────────────────────────────────────────

async function fetchCsv(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CSV fetch failed (${resp.status}) for ${url}`);
  return parseCsv(await resp.text());
}

// ── Main loader ────────────────────────────────────────────────────────────

export async function loadData() {
  const [qRows, sRows, syRows, shipRows] = await Promise.all([
    fetchCsv(SHEETS_QUADRANTS_URL),
    fetchCsv(SHEETS_SECTORS_URL),
    fetchCsv(SHEETS_SYSTEMS_URL),
    fetchCsv(SHEETS_STARSHIPS_URL),
  ]);

  // ── Quadrants ──────────────────────────────────────────────────────────
  console.log('[data] quadrant headers:', qRows[0] ? Object.keys(qRows[0]) : 'none');
  console.log('[data] sector headers:',   sRows[0] ? Object.keys(sRows[0]) : 'none');
  console.log('[data] system headers:',   syRows[0] ? Object.keys(syRows[0]) : 'none');
  console.log('[data] starship headers:', shipRows[0] ? Object.keys(shipRows[0]) : 'none');

  const quadrants = qRows.map(r => ({
    id:     r['Name'],           // name serves as stable key
    name:   r['Name'],
    width:  parseInt(r['Width'],  10) || 6,
    height: parseInt(r['Height'], 10) || 6,
  }));

  // ── Sectors ────────────────────────────────────────────────────────────
  const sectors = sRows.map(r => {
    const quadName = r['Quadrant'];
    const quad  = quadrants.find(q => q.name === quadName);
    if (!quad) console.warn('[data] sector missing quadrant:', r['Name'], '->', quadName);
    const index = parseInt(r['Index'], 10) || 0;
    const { a, b } = indexToGrid(index, quad?.width ?? 1);
    return {
      id:           r['Name'],
      name:         r['Name'],
      quadrantName: quad?.name ?? quadName ?? 'Unknown',
      a,
      b,
      canon:        r['Canon'] === 'checked',
    };
  });

  // ── Systems ────────────────────────────────────────────────────────────
  const systems = syRows.map(r => {
    const secName = r['Sector'];
    const sec = sectors.find(s => s.name === secName);
    if (!sec) console.warn('[data] system missing sector:', r['Name'], '->', secName);
    const x            = parseFloat(r['X']) || 0;
    const y            = parseFloat(r['Y']) || 0;
    const quadrantName = sec?.quadrantName ?? 'Unknown';
    const a            = sec?.a ?? 0;
    const b            = sec?.b ?? 0;

    let gx = 0, gy = 0;
    try {
      ({ gx, gy } = toGalaxyLY(quadrantName, a, b, x, y));
    } catch (e) {
      console.warn(`[data] skipping gx/gy for system "${r['Name']}": ${e.message}`);
    }

    return {
      id:           r['Name'],
      name:         r['Name'],
      sectorName:   sec?.name  ?? secName ?? 'Unknown',
      quadrantName,
      a, b, x, y, gx, gy,
      type:         r['Type']    ?? '',
      url:          r['Url']     ?? '',
      faction:      r['Faction'] ?? '',
      canon:        r['Canon'] === 'checked',
    };
  });

  // ── Starships ──────────────────────────────────────────────────────────
  const starships = shipRows.map(r => ({
    id:          r['Name'],
    name:        r['Name']      ?? '',
    serial:      r['Serial']    ?? '',
    shipClass:   r['Class']     ?? '',
    faction:     r['Faction']   ?? '',
    contact:     r['Contact']   ?? '',
    tokenUrl:    r['Token']     ?? null,
    routeDocUrl: r['Route Doc'] ?? '',
    infoUrl:     r['Info URL']  ?? '',
  }));

  return { quadrants, sectors, systems, starships };
}