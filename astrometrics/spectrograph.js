// ── Class definitions ──────────────────────────────────────────────────────
const CLASSES = {
  G: { label: 'Geoplastic',  color: '#8B0000', pos: 0.04 },
  Y: { label: 'Demon',       color: '#CC2200', pos: 0.11 },
  N: { label: 'Reducing',    color: '#DD4400', pos: 0.20 },
  H: { label: 'Arid/Harsh',  color: '#EE7700', pos: 0.31 },
  K: { label: 'Adaptable',   color: '#DDAA00', pos: 0.40 },
  D: { label: 'Planetoid',   color: '#CCCC00', pos: 0.48 },
  P: { label: 'Glaciated',   color: '#88CC00', pos: 0.55 },
  L: { label: 'Marginal',    color: '#44AA00', pos: 0.62 },
  M: { label: 'Terrestrial', color: '#00AA44', pos: 0.69 },
  O: { label: 'Pelagic',     color: '#00AAAA', pos: 0.76 },
  R: { label: 'Unstable',    color: '#0088AA', pos: 0.83 },
  J: { label: 'Gas Giant',   color: '#2244CC', pos: 0.90 },
  T: { label: 'Ultragiant',  color: '#6600CC', pos: 0.97 },
};

// ── Sample system ──────────────────────────────────────────────────────────
const SAMPLE_SYSTEM = {
  name: 'Senesky System',
  bodies: [
    { id: 'I',   class: 'H', name: 'Senesky-A', gravity: 1.64, orbital_radius: 1.11, notes: '&nbsp;' },
    { id: 'II',  class: 'M', name: 'Senesky Prime', gravity: 1.11, orbital_radius: 1.44, notes: 'Thin, planetary rings' },
    { id: 'III', class: 'D', name: 'Asteroid Belt', gravity: 0.1, orbital_radius: 2.23, notes: '&nbsp;' },
    { id: 'IV', class: 'J', name: 'Senesky-C', gravity: 7.01, orbital_radius: 3.84, notes: '31 moons' },
    { id: 'V',  class: 'J', name: 'Senesky-D', gravity: 7.98, orbital_radius: 11.72, notes: 'Planetary rings, 28 moons' },
    { id: 'VI',  class: 'D', name: 'Senesky-E', gravity: 1.10, orbital_radius: 24.67, notes: '&nbsp;' },
    { id: 'VII',  class: 'P', name: 'Senesky-F', gravity: 0.98, orbital_radius: 47.18, notes: '&nbsp;' },
    { id: 'VIII',  class: 'D', name: 'Senesky-G', gravity: 1.63, orbital_radius: 99.09, notes: 'Ice rings' },
    { id: 'IX',  class: 'P', name: 'Asteroid Belt', gravity: 0.1, orbital_radius: 197.77, notes: '&nbsp;' },
    { id: 'X',  class: 'P', name: 'Senesky-H', gravity: 1.29, orbital_radius: 365.79, notes: 'Ice rings' },
    { id: 'XI',  class: 'P', name: 'Senesky-I', gravity: 0.99, orbital_radius: 487.34, notes: '&nbsp;' }
  ]
};

// -- GLOBAL VARIABLES  ────────────────────────────────────────────────────────── //

const signalsList = document.getElementById('contacts');
const statusEl = document.getElementById('status');

const rainbowCanvas = document.getElementById("rainbow");
const rCtx = rainbowCanvas.getContext('2d');
const waveformCanvas = document.getElementById("waveform");
const wCtx = waveformCanvas.getContext('2d');

let system = SAMPLE_SYSTEM;
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

init();

// -- CORE FUNCTIONS  ─────────────────────────────────────────────────────── //

function init() {
  resizeCanvases();
  renderLoop(); // add this

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
//  emptyMsg.style.display = 'none';
 
  const entry = document.createElement('div');
  entry.className = 'contact-entry';
  entry.id = 'contact-' + id;
  entry.innerHTML = `
    <span class="contact-class" style="color:${def.color}">${cls}</span>
    <div>
      <div class="contact-meta">
        <span class="contact-name">${body.name}</span>
        <span class="contact-type" style="background-color:${def.color}80">${def.label}</span>
      </div>
      <div class="contact-detail">${body.notes || ''}</div>
    </div>
  `;
  entry.addEventListener('click', () => activateContact(id));
  contacts.appendChild(entry);
  requestAnimationFrame(() => requestAnimationFrame(() => entry.classList.add('visible')));
  activateContact(id);
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

// ── Rainbow bar ────────────────────────────────────────────────────────────
function drawRainbow(pos) {
  const W = rainbowCanvas.width;
  const H = rainbowCanvas.height;
  const dpr = window.devicePixelRatio || 1;
  rCtx.clearRect(0, 0, W, H);
 
  // Gradient
  const grad = rCtx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0.00, '#8B000077');
  grad.addColorStop(0.11, '#CC220066');
  grad.addColorStop(0.20, '#DD440066');
  grad.addColorStop(0.31, '#EE770066');
  grad.addColorStop(0.40, '#DDAA0066');
  grad.addColorStop(0.48, '#CCCC0066');
  grad.addColorStop(0.55, '#88CC0066');
  grad.addColorStop(0.62, '#44AA0066');
  grad.addColorStop(0.69, '#00AA4477');
  grad.addColorStop(0.76, '#00AAAA66');
  grad.addColorStop(0.83, '#0088AA66');
  grad.addColorStop(0.90, '#2244CC66');
  grad.addColorStop(1.00, '#6600CC77');
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
  const radii = allBodies.map(b => b.orbital_radius);
  const minLog = Math.log(Math.min(...radii));
  const maxLog = Math.log(Math.max(...radii));
  return 0.08 + ((Math.log(body.orbital_radius) - minLog) / (maxLog - minLog)) * 0.84;
}
 
function getActiveBodies(pos) {
  const result = [];
  for (const [cls, def] of Object.entries(CLASSES)) {
    const dist = Math.abs(pos - def.pos);
    const bandwidth = 0.048;
    if (dist < bandwidth) {
      const strength = Math.max(0, 1 - dist / bandwidth);
      for (const body of system.bodies) {
        if (body.class === cls) {
          result.push({ body, cls, def, strength });
        }
      }
    }
  }
  return result;
}
 
function buildWaveformTargets(activeBodies) {
  return activeBodies.map(({ body, cls, def, strength }) => ({
    id:    body.id,
    x:     bodyWaveX(body, system.bodies),
    amp:   strength * (0.18 + Math.min(body.gravity || 1.0, 12.0) * 0.12),
    sigma: 0.019 + (body.gravity || 1.0) * 0.004,
    color: def.color,
    body, cls, def,
  }));
}
 
function gaussian(x, mu, sigma) {
  return Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
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
  
  // Single waveform line
  wCtx.strokeStyle = baselineColor;
  wCtx.lineWidth = 1.5 * dpr;
  wCtx.beginPath();
  for (let px = 0; px < W; px++) {
    const noise = (Math.sin(px * 0.71 + noiseTime + 2.3) + Math.sin(px * 1.57 + noiseTime * 0.7 + 0.9) + Math.sin(px * 0.31 + noiseTime * 1.3 + 4.1)) * noiseAmp * 0.6;
    
    let offset = 0;
    for (const peak of waveformCurrent) {
      if (peak.amp < 0.005) continue;
      const cx = peak.x * W;
      const sigPx = peak.sigma * W;
      const ampPx = peak.amp * baseline * 0.92;
      offset += gaussian(px, cx, sigPx) * ampPx;
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