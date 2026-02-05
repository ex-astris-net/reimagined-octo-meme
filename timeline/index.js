import { state } from "./state.js";
import { loadTimelineData } from "./data.js";
import { drawAxis } from "./draw/axis.js";
import { drawDots } from "./draw/dots.js";
import { drawLabels } from "./draw/labels.js";
import { initMinimap, drawMinimap } from "./draw/minimap.js";
import { updateTimeScale } from "./scales/time.js";
import { enablePan } from "./interaction/pan.js";
import { enableZoom, MIN_SPAN, MAX_SPAN } from "./interaction/zoom.js";
import { enableClick } from "./interaction/click.js";
import { enableMinimapInteraction } from "./interaction/minimap.js";
import { enableKeyboardPan } from "./interaction/keyboard.js";

const INITIAL_SPAN = 1 * 365 * 24 * 60 * 60 * 1000;   // 1 year
const OUT_OF_BOUNDS_PADDING = 0.25;

// DOM
const container = document.getElementById("timeline-container");
const canvas = document.getElementById("timeline-canvas");
const svg = document.getElementById("timeline-svg");
const minimap = document.getElementById("minimap-canvas");
const minimapCtx = minimap.getContext("2d");
const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;

// Size
state.width = container.clientWidth;
state.height = container.clientHeight;
state.centerY = state.height / 2;

state.minimapWidth = container.clientWidth;
state.minimapHeight = minimap.height;
minimap.width = state.minimapWidth;

canvas.width = state.width * dpr;
canvas.height = state.height * dpr;
canvas.style.width = `${state.width}px`;
canvas.style.height = `${state.height}px`;

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

svg.setAttribute("width", state.width);
svg.setAttribute("height", state.height);

// Data
const data = await loadTimelineData();
console.log("data =", data);

const times = data.map(d => d.time);
state.viewStart = Math.min(...times);
state.viewEnd = Math.max(...times);
state.dataMin = Math.min(...times);
state.dataMax = Math.max(...times);

const dataSpan = state.dataMax - state.dataMin;

state.timeMin = state.dataMin - dataSpan * OUT_OF_BOUNDS_PADDING;
state.timeMax = state.dataMax + dataSpan * OUT_OF_BOUNDS_PADDING;

const span = Math.min(
    MAX_SPAN,
    Math.max(MIN_SPAN, Math.min(INITIAL_SPAN, dataSpan))
);

const center = (state.dataMin + state.dataMax) / 2;

state.viewStart = center - span / 2;
state.viewEnd = center + span / 2;

// clamp
if (state.viewStart < state.dataMin) {
    state.viewStart = state.dataMin;
    state.viewEnd = state.viewStart + span;
}
if (state.viewEnd > state.dataMax) {
    state.viewEnd = state.dataMax;
    state.viewStart = state.viewEnd - span;
}
// ----------------------------

initMinimap(data);

// Before drawing
updateTimeScale();

function drawAll() {
    ctx.clearRect(0, 0, state.width, state.height);

    drawAxis(svg);
    drawLabels(ctx, data);
    drawDots(ctx, data);
    drawMinimap(minimapCtx, data);
}

// Initial draw
drawAll();

// Interaction
enablePan(canvas, () => {
  drawAll();
});

enableZoom(canvas, () => {
  drawAll();
});

enableClick(canvas);

enableMinimapInteraction(minimap, () => {
    drawAll();
});

enableKeyboardPan(() => {
    drawAll();
});


// Zoom buttons
const buttons = document.querySelectorAll("#zoom-buttons button");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const span = Number(btn.dataset.span);

    // Optionally zoom around current center
    const center = (state.viewStart + state.viewEnd) / 2;

    state.viewStart = center - span / 2;
    state.viewEnd = center + span / 2;

    updateTimeScale();
    drawAll();
  });
});
