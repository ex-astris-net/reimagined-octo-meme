
// ── Class definitions ──────────────────────────────────────────────────────
const CLASSES = {
  Y: { label: 'Demon',       color: '#8B0000', pos: 0.02 },
  G: { label: 'Geoplastic',  color: '#AA1100', pos: 0.07 },
  N: { label: 'Reducing',    color: '#CC3300', pos: 0.13 },
  H: { label: 'Arid/Harsh',  color: '#DD5500', pos: 0.20 },
  D: { label: 'Planetoid',   color: '#CC8800', pos: 0.28 },
  A: { label: 'Alloy',       color: '#DD9944', pos: 0.35 },
  C: { label: 'Organic',     color: '#BBAA00', pos: 0.41 },
  K: { label: 'Adaptable',   color: '#88AA00', pos: 0.48 },
  L: { label: 'Marginal',    color: '#44BB00', pos: 0.54 },
  M: { label: 'Terrestrial', color: '#00AA44', pos: 0.60 },
  O: { label: 'Pelagic',     color: '#00AAAA', pos: 0.68 },
  P: { label: 'Ice Giant',   color: '#0088BB', pos: 0.75 },
  J: { label: 'Gas Giant',   color: '#2233CC', pos: 0.82 },
  T: { label: 'Substellar',  color: '#5500CC', pos: 0.90 },
  S: { label: 'Stellar',     color: '#ff00ff', pos: 0.98 },
};

// -- GLOBAL VARIABLES  ────────────────────────────────────────────────────────── //

const signalsList = document.getElementById('contacts');
const statusEl = document.getElementById('status');

const rainbowCanvas = document.getElementById("rainbow");
const rCtx = rainbowCanvas.getContext('2d');
const waveformCanvas = document.getElementById("waveform");
const wCtx = waveformCanvas.getContext('2d');

// get sheet name, use sample if none included
const params = new URLSearchParams(window.location.search);
const systemSheetName = params.get("system");

// fetch sheet data here
const KNOWN_COLUMNS = new Set(['Class', 'Type', 'Name', 'Orbit', 'Mass', 'Notes']);
const system = fetchSheetData(systemSheetName).then(data => {

  if (data.length > 0) {
    system.name = systemSheetName;
    system.bodies = data.map((item, i) => {
      const extras = {};
      for (const key of Object.keys(item)) {
        if (!KNOWN_COLUMNS.has(key)) extras[key] = item[key];
      }

      return {
        id: String(i),
        class: item.Class,
        type: item.Type,
        name: item.Name,
        orbit: item.Orbit,
        mass: item.Mass,
        notes: item.Notes,
        ...(Object.keys(extras).length > 0 ? { extras } : {}),
      };
    });

    console.log("LOADED SYSTEM:", system);
    setStatus(`Scanning ${systemSheetName}...`);
  }
  else {
    system.bodies = [];
    setStatus(`No system found.`);
  }

  init();
});


let activeBodies = [];
let activeContact = null;
let revealed = new Set();

let noiseTime = 0;
let waveformAnim = null;
let waveformCurrent = [];
let baselineColor = CLASSES.G.color;


// -- INTERACTIONS  ────────────────────────────────────────────────────────── //
let rainbowNeedlePos = 0.00;

// rainbow spectrum
let isDragging = false;
rainbowCanvas.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('mouseup', () => isDragging = false);
rainbowCanvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  rainbowNeedlePos = e.offsetX / rainbowCanvas.offsetWidth;

  if (activeBodies.length > 0) {
    const top = [...activeBodies].sort((a, b) => b.strength - a.strength)[0];
    if (top.strength > 0.55) {
      setStatus(`Class ${top.cls} band — <span class="blink">resolving...</span>`);
      resolveTimer = setTimeout(() => {
        for (const { body, cls, def } of activeBodies)
          revealContact(body, cls, def);

        const names = activeBodies
          .map(a => `<span style="color:${a.def.color}">${a.body.name}</span>`)
          .join(', ');
        setStatus(`Resolved — ${names}`);
      }, 850);
    }
    else {
      setStatus(`Weak signal — Class ${top.cls} band`);
    }
  }
  else {
    setStatus('No contact');
  }

  requestAnimationFrame(drawLoop);
});

// // touch controls because tablet fun lol
// rainbowCanvas.addEventListener('touchstart', () => isDragging = true);
// window.addEventListener('touchend', () => isDragging = false);
// rainbowCanvas.addEventListener('touchmove', (e) => {
//   if (!isDragging) return;
//   rainbowNeedlePos = e.touches[0] / rainbowCanvas.offsetWidth;
//   requestAnimationFrame(drawLoop);
// });

// -- CORE FUNCTIONS  ─────────────────────────────────────────────────────── //

function init() {
  resizeCanvases();
  renderLoop();

  window.addEventListener('resize', () => {
    resizeCanvases();
  });
}

function renderLoop() {
  noiseTime += 0.22;

  drawRainbow(rainbowNeedlePos);
  updateWaveform();
  drawWaveform();
  requestAnimationFrame(renderLoop);
}

function drawLoop() {
  drawRainbow(rainbowNeedlePos);
  updateWaveform();
  drawWaveform();
}

function updateWaveform() {
  activeBodies = getActiveBodies(rainbowNeedlePos);
  const { def } = getNearestClass(rainbowNeedlePos);
  baselineColor = def.color;
  animateWaveform(buildWaveformTargets(activeBodies));
  highlightActiveBand(activeBodies);
}

function resizeCanvases() {
  const dpr = window.devicePixelRatio || 1;
  const parentW = rainbowCanvas.parentElement.getBoundingClientRect().width;
  for (const [canvas, h] of [[rainbowCanvas, 56], [waveformCanvas, 250]]) {
    canvas.width  = parentW * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = parentW + 'px';
    canvas.style.height = h + 'px';
  }
}

function setStatus(html) { statusEl.innerHTML = html; }

// ── Contacts ───────────────────────────────────────────────────────────────

function revealContact(body, cls, def) {
  const id = body.id;
  if (revealed.has(id)) { activateContact(id); return; }
  revealed.add(id);

  const entry = document.createElement('div');
  entry.className = 'contact-entry';
  entry.id = 'contact-' + id;
  entry.innerHTML = `
    <div class="contact-meta">
      <span class="contact-class" style="color:${def.color}">${cls}</span>
      <div class="contact-basic">
        <span class="contact-name">${body.name}</span>
        <span class="contact-type" style="background-color:${def.color}80">${def.label}</span>
      </div>
      <span class="contact-metric">
        ${body.mass ? `<span class="metric-label">Mass</span>
          <span>${body.mass} ${(body.class === 'S' || body.class === 'T') ? 'Mo' : 'Me'}</span>` : ''}
      </span>
      <span class="contact-metric">
        ${body.orbit ? `<span class="metric-label">Orbit</span>
          <span>${body.orbit} AU</span>` : ''}
      </span>
    </div>

    ${body.notes ? `<div class="contact-notes contact-expanded">
      <span class="metric-label">NOTES</span> <span>${body.notes || ''}</span>
    </div>` : ''}

    ${ifExtrasExist(body.extras) ? `<div class="contact-extras contact-expanded">
      ${body.extras ? Object.entries(body.extras)
        .filter(([k, v]) => v != null && v !== '')
        .map(([k, v]) => `<span class="contact-metric"><span class="metric-label">${k}</span><span>${v}</span></span>`)
        .join('') : ''}
    </div>` : ''}

    </div>
  `;
  entry.addEventListener('click', () => activateContact(id));
  signalsList.appendChild(entry);
  requestAnimationFrame(() => requestAnimationFrame(() => entry.classList.add('visible')));
  activateContact(id);
  sortContacts();
}

function activateContact(id) {
  if (activeContact) {
    const prev = document.getElementById('contact-' + activeContact);
    if (prev) prev.classList.remove('active');
  }
  activeContact = id;
  const el = document.getElementById('contact-' + id);
  if (el) el.classList.add('active');
}

function highlightActiveBand(activeBodies) {
  document.querySelectorAll('.contact-entry').forEach(el => el.classList.remove('band-active'));
  for (const { body } of activeBodies) {
    const el = document.getElementById('contact-' + body.id);
    if (el) el.classList.add('band-active');
  }
}

function sortContacts() {
  const entries = [...signalsList.querySelectorAll('.contact-entry')];
  entries.sort((a, b) => {
    const aId = a.id.replace('contact-', '');
    const bId = b.id.replace('contact-', '');
    const aBody = system.bodies.find(b => b.id === aId);
    const bBody = system.bodies.find(b => b.id === bId);
    return (aBody?.orbit || 0) - (bBody?.orbit || 0);
  });
  entries.forEach(el => signalsList.appendChild(el));
}

function ifExtrasExist(extras) {
  return Object.values(extras).some(v => v !== null);
}

// ── Rainbow bar ────────────────────────────────────────────────────────────
function drawRainbow(pos) {
  const W = rainbowCanvas.width;
  const H = rainbowCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  rCtx.clearRect(0, 0, W, H);

  // Gradient
  const grad = rCtx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0.02, '#8B000077');
  grad.addColorStop(0.07, '#AA110066');
  grad.addColorStop(0.13, '#CC330066');
  grad.addColorStop(0.20, '#DD550066');
  grad.addColorStop(0.28, '#CC880066');
  grad.addColorStop(0.35, '#DD991166');
  grad.addColorStop(0.41, '#BBAA0066');
  grad.addColorStop(0.48, '#66BB0066');
  grad.addColorStop(0.54, '#00AA4477');
  grad.addColorStop(0.60, '#00AA8866');
  grad.addColorStop(0.68, '#0099BB66');
  grad.addColorStop(0.75, '#0088BB66');
  grad.addColorStop(0.82, '#2233CC66');
  grad.addColorStop(0.90, '#5500CC77');
  grad.addColorStop(0.98, '#ff00f277');
  rCtx.fillStyle = grad;
  rCtx.fillRect(0, 0, W, H);

  // Border
  rCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  rCtx.lineWidth = 1;
  rCtx.strokeRect(0, 0, W, H);

  // Class ticks and labels
  for (const [cls, def] of Object.entries(CLASSES)) {
    const x = def.pos * W;
    rCtx.strokeStyle = def.color + 'bb';
    rCtx.lineWidth = 1 * dpr;
    rCtx.beginPath();
    rCtx.moveTo(x, H * 0.55);
    rCtx.lineTo(x, H);
    rCtx.stroke();
    rCtx.fillStyle = def.color + 'cc';
    rCtx.font = `${9 * dpr}px 'Share Tech Mono', monospace`;
    rCtx.textAlign = 'center';
    rCtx.fillText(cls, x, H * 0.38);
  }

  // Needle
  const needleX = pos * W;
  rCtx.strokeStyle = 'rgba(200,216,232,0.95)';
  rCtx.lineWidth = 1.5 * dpr;
  rCtx.beginPath();
  rCtx.moveTo(needleX, 0);
  rCtx.lineTo(needleX, H);
  rCtx.stroke();

  // Needle bottom triangle
  rCtx.fillStyle = 'rgba(200,216,232,0.95)';
  rCtx.beginPath();
  rCtx.moveTo(needleX, H);
  rCtx.lineTo(needleX - 5 * dpr, H - 8 * dpr);
  rCtx.lineTo(needleX + 5 * dpr, H - 8 * dpr);
  rCtx.closePath();
  rCtx.fill();
}


// ── Waveform ───────────────────────────────────────────────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed * 9301.0 + 49297.0) * 233280.0;
  return x - Math.floor(x);
}

function bodyWaveX(body, allBodies) {
  const valid = allBodies.filter(b => b.orbit != null);
  const radii = valid.map(b => b.orbit);
  const minLog = Math.log(Math.min(...radii));
  const maxLog = Math.log(Math.max(...radii));

  if (body.orbit == null) return 0.02;

  return 0.08 + (
    (Math.log(body.orbit) - minLog) /
    (maxLog - minLog)
  ) * 0.84;
}

function getActiveBodies(pos) {
  const result = [];
  for (const [cls, def] of Object.entries(CLASSES)) {
    const dist = Math.abs(pos - def.pos);
    const bandwidth = 0.048;
    if (dist < bandwidth) {
      const strength = Math.max(0, 1 - dist / bandwidth);
      for (const body of system.bodies) {
        if (body.type === 'anomaly') continue;
        if (body.class === cls) {
          result.push({ body, cls, def, strength });
        }
      }
    }
  }
  return result;
}

// ── Mass → amplitude ───────────────────────────────────────────────────────
// S and T-class bodies use M☉; all other classes use M⊕.
// Both scales are log-normalised so the curve shape is consistent,
// but the reference maxima differ to keep stellar objects from
// overwhelming the waveform relative to planetary ones.
function massToAmp(body) {
  const isStellar = body.class === 'S' || body.class === 'T';
  const mass = body.type === 'field' ? 0.05 : (body.mass ?? 1.0);

  const maxMass = isStellar ? 100 : 300;
  const normalized = Math.log1p(mass) / Math.log1p(maxMass);
  const linear = mass / maxMass;
  const blended = normalized * 0.35 + linear * 0.65;
  return Math.pow(Math.min(blended, 1), 0.55);
}

function buildWaveformTargets(activeBodies) {
  return activeBodies.map(({ body, cls, def, strength }) => ({
    id:    body.id,
    x:     bodyWaveX(body, system.bodies),
    amp:   strength * (0.18 + massToAmp(body) * 0.6),
    sigma: 0.019 + massToAmp(body) * 0.025,
    color: def.color,
    body, cls, def,
  }));
}

function getSignalOffset(peak, px, cx, sigPx, ampPx) {
  const type = peak.body.type || 'body';

  if (type === 'stellar')    return stellar(sigPx, px - cx, ampPx);
  if (type === 'field')      return field(peak, px, cx, sigPx, ampPx, px - cx);
  if (type === 'artificial') return artificial(px, cx, sigPx, ampPx);
  if (type === 'biosign')    return biosign(peak, px, cx, sigPx, ampPx);
  if (type === 'anomaly')    return anomaly(px, cx, sigPx, ampPx);

  return gaussian(px, cx, sigPx) * ampPx;
}

function gaussian(x, mu, sigma) {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
}

function stellar(sigPx, dx, ampPx) {
  const width = sigPx * 0.6;
  const d = Math.abs(dx);
  if (d > width) return 0;
  return (1 - d / width) * ampPx * 1.4;
}

function field(peak, px, cx, sigPx, ampPx, dx) {
  const falloff = Math.exp(-Math.abs(dx) / (sigPx * 5.5)) ** 1.75;
  if (falloff < 0.01) return 0;

  const seed = peak.body.id.charCodeAt(0);

  const wave =
    Math.sin((px - cx) * 0.22 + seed + noiseTime * 0.7) * 0.50 +
    Math.sin((px - cx) * 0.37 + seed * 1.3 + noiseTime * 0.45) * 0.35 +
    Math.sin((px - cx) * 0.61 + seed * 0.7 + noiseTime * 0.31) * 0.25 +
    Math.sin((px - cx) * 0.13 + seed * 2.1 + noiseTime * 0.19) * 0.20 +
    Math.sin((px - cx) * 0.47 + seed * 1.7 + noiseTime * 0.13) * 0.15 +
    Math.sin((px - cx) * 0.09 + seed * 0.4 + noiseTime * 0.09) * 0.15;

  const normalized = (wave / 1.6 + 1) * 0.7;

  return falloff * normalized * ampPx * 0.85;
}

function artificial(px, cx, sigPx, ampPx) {
  const g = gaussian(px, cx, sigPx * 1.2);
  if (g < 0.01) return 0;

  const freq = 0.045;
  const steps = 5;
  const wave = Math.sign(Math.sin((px - cx) * freq * Math.PI));
  const quantized = Math.round(g * steps) / steps;

  return quantized * ((wave + 1) / 2) * ampPx * 1.1;
}

function biosign(peak, px, cx, sigPx, ampPx) {
  const width = sigPx * 3.1;
  const dx = px - cx;
  if (Math.abs(dx) > width) return 0;
  const envelope = Math.sin((dx / width + 1) * Math.PI / 2) ** 1.4;

  const freq = 0.08;
  const cycle = (((px - cx) * freq % (Math.PI * 0.5)) + Math.PI * 0.9) % (Math.PI * 0.5);

  let beat = 0;
  if (cycle < 0.9) {
    beat = Math.sin((cycle / 0.9) * Math.PI);
  } else if (cycle < 1.2) {
    beat = -0.2 * Math.sin(((cycle - 0.9) / 0.3) * Math.PI);
  } else if (cycle < 1.5) {
    beat = 0.15 * Math.sin(((cycle - 1.2) / 0.3) * Math.PI);
  } else {
    beat = 0;
  }

  const breathe = 0.85 + 0.15 * Math.sin(noiseTime * 0.4);
  return envelope * Math.max(0, beat) * breathe * ampPx * 1.4;
}

function anomaly(px, cx, sigPx, ampPx) {
  const g = gaussian(px, cx, sigPx * 1.3);
  if (g < 0.01) return 0;
  return -(Math.min(g * ampPx, 50));
}

function drawWaveform() {
  const W = waveformCanvas.width;
  const H = waveformCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  wCtx.clearRect(0, 0, W, H);

  const baseline = H * 0.82;
  const noiseAmp = H * 0.010;

  // Subtle grid
  wCtx.strokeStyle = 'rgba(255,255,255,0.03)';
  wCtx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = baseline - (i / 4) * baseline * 0.88;
    wCtx.beginPath();
    wCtx.moveTo(0, y);
    wCtx.lineTo(W, y);
    wCtx.stroke();
  }

  const anomalies = system.bodies.filter(b => b.type === 'anomaly');

  wCtx.strokeStyle = baselineColor;
  wCtx.lineWidth = 1.5 * dpr;
  wCtx.beginPath();

  for (let px = 0; px < W; px++) {
    const noise = (
      Math.sin(px * 0.71  + noiseTime + 2.3) +
      Math.sin(px * 1.57  + noiseTime * 0.7 + 0.9) +
      Math.sin(px * 0.31  + noiseTime * 1.3 + 4.1)
    ) * noiseAmp * 0.6;

    let offset = 0;

    for (const peak of waveformCurrent) {
      if (peak.amp < 0.005) continue;
      const cx    = peak.x * W;
      const sigPx = peak.sigma * W;
      const ampPx = peak.amp * baseline * 0.92;
      offset += getSignalOffset(peak, px, cx, sigPx, ampPx);
    }

    // anomaly interference — always present, full width
    for (const body of anomalies) {
      const cx    = bodyWaveX(body, system.bodies) * W;
      const sigPx = (0.019 + massToAmp(body) * 0.025) * W;
      const ampPx = (0.18  + massToAmp(body) * 0.6)   * baseline * 0.92;
      const peak  = { body, cls: body.class, def: CLASSES[body.class] || CLASSES.Y };
      offset += getSignalOffset(peak, px, cx, sigPx, ampPx);
    }

    const y = baseline - offset + noise;
    px === 0 ? wCtx.moveTo(px, y) : wCtx.lineTo(px, y);
  }
  wCtx.stroke();
}

// ── Waveform animation ─────────────────────────────────────────────────────
function animateWaveform(targets) {
  cancelAnimationFrame(waveformAnim);

  const allIds = new Set([
    ...waveformCurrent.map(p => p.id),
    ...targets.map(p => p.id),
  ]);

  const next = [];
  for (const id of allIds) {
    const cur = waveformCurrent.find(p => p.id === id);
    const tgt = targets.find(p => p.id === id);
    if (tgt) {
      next.push({ ...tgt, amp: cur ? cur.amp : 0 });
    } else if (cur && cur.amp > 0.003) {
      next.push({ ...cur, _target: 0 });
    }
  }
  waveformCurrent = next;

  function step() {
    let animating = false;
    for (const peak of waveformCurrent) {
      const target = peak._target !== undefined ? peak._target
        : (targets.find(t => t.id === peak.id)?.amp || 0);
      const diff = target - peak.amp;
      if (Math.abs(diff) > 0.003) {
        peak.amp += diff * 0.14;
        animating = true;
      } else {
        peak.amp = target;
      }
    }
    waveformCurrent = waveformCurrent.filter(p => p.amp > 0.002);
    if (animating) waveformAnim = requestAnimationFrame(step);
  }
  step();
}

function getNearestClass(pos) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const [cls, def] of Object.entries(CLASSES)) {
    const dist = Math.abs(pos - def.pos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = { cls, def };
    }
  }
  return nearest;
}