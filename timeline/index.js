import { state } from "./state.js";
import { loadTimelineData } from "./data.js";
import { drawAxis } from "./draw/axis.js";
import { drawDots } from "./draw/dots.js";
import { drawLabels } from "./draw/labels.js";
import { updateTimeScale } from "./scales/time.js";
import { enablePan } from "./interaction/pan.js";
import { enableZoom } from "./interaction/zoom.js";
import { enableClick } from "./interaction/click.js";

// DOM
const container = document.getElementById("timeline-container");
const canvas = document.getElementById("timeline-canvas");
const svg = document.getElementById("timeline-svg");
const ctx = canvas.getContext("2d");
const dpr = window.devicePixelRatio || 1;

// Size
state.width = container.clientWidth;
state.height = container.clientHeight;
state.centerY = state.height / 2;

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

// Before drawing
updateTimeScale();

function drawAll() {
    ctx.clearRect(0, 0, state.width, state.height);

    drawAxis(svg);
    drawLabels(ctx, data);
    drawDots(ctx, data);
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
