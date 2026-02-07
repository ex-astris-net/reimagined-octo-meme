/* ============================================================
 * Imports
 * ========================================================== */

// Core state & data
import { state } from "./state.js";
import { initTagStore, loadTagToStore, tagStore, eventStore } from "./data.js";

// Drawing
import { drawAxis } from "./draw/axis.js";
import { drawDots } from "./draw/dots.js";
import { drawLabels } from "./draw/labels.js";
import { initMinimap, drawMinimap } from "./draw/minimap.js";
import { populateFilters } from "./filters.js";

// Scales
import { updateTimeScale } from "./scales/time.js";

// Interaction
import { enablePan } from "./interaction/pan.js";
import { enableZoom, MIN_SPAN, MAX_SPAN } from "./interaction/zoom.js";
import { enableClick } from "./interaction/click.js";
import { enableMinimapInteraction } from "./interaction/minimap.js";
import { enableKeyboardPan } from "./interaction/keyboard.js";


/* ============================================================
 * Configuration
 * ========================================================== */

const INITIAL_SPAN = 1 * 365 * 24 * 60 * 60 * 1000;   // 1 year
const OUT_OF_BOUNDS_PADDING = 0.25;                   // % extra time on each side


/* ============================================================
 * DOM & Canvas Setup
 * ========================================================== */

const container = document.getElementById("timeline-container");
const canvas = document.getElementById("timeline-canvas");
const svg = document.getElementById("timeline-svg");
const minimap = document.getElementById("minimap-canvas");

const ctx = canvas.getContext("2d");
const minimapCtx = minimap.getContext("2d");
const dpr = window.devicePixelRatio || 1;


/* ============================================================
 * Layout / Sizing
 * ========================================================== */

state.width = container.clientWidth;
state.height = container.clientHeight;
state.centerY = state.height / 2;

// Main canvas (HiDPI-safe)
canvas.width = state.width * dpr;
canvas.height = state.height * dpr;
canvas.style.width = `${state.width}px`;
canvas.style.height = `${state.height}px`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// SVG overlay
svg.setAttribute("width", state.width);
svg.setAttribute("height", state.height);

// Minimap sizing
state.minimapWidth = container.clientWidth;
state.minimapHeight = minimap.height;
minimap.width = state.minimapWidth;


/* ============================================================
 * Data Load 
 * ========================================================== */

const tagToStartWith = 'azedi';

const timelineState = {
    renderedEvents: [],
    filters: {
      activeTags: new Set([tagToStartWith]),
      activeCategories: new Set(),
      mode: "OR" // or "AND". obviously.
    }
};

await initTagStore();

// initial values
await loadTagToStore(tagToStartWith);
fitDataToFilters();

const filtersUI = populateFilters(tagStore, timelineState.filters, {
    onTagToggle: async (tagName, added) => { 
        if (added && !tagStore[tagName].fetched) {
            await loadTagToStore(tagName);
        }
        
        dataUpdatedRedraw();
    },
    onSwitchToggle: async (mode) => {
        console.log("onSwitchToggling", mode);
        timelineState.filters.mode = mode;

        dataUpdatedRedraw();
    }
});

// primary data rendering loop
function dataUpdatedRedraw() {
    fitDataToFilters();    
    initMinimap(timelineState.renderedEvents);
    drawAll();
}

function fitDataToFilters() {
    console.log("Fitting data to filters...");

    const { activeTags, mode } = timelineState.filters;

    if (!activeTags || activeTags.size === 0) {
        timelineState.renderedEvents = [];
        return;
    }

    const activeTagList = [...activeTags];

    timelineState.renderedEvents = Object.values(eventStore).filter(event => {
        if (!event?.tags || event.tags.length === 0) return false;

        if (mode === "OR") {
            // Event matches if it has *any* active tag
            return activeTagList.some(tag => event.tags.includes(tag));
        }

        // AND
        // Event matches if it has *all* active tags
        return activeTagList.every(tag => event.tags.includes(tag));
    });

    console.log(
        "timelineState.renderedEvents =",
        timelineState.renderedEvents
    );
}


/* ============================================================
 * Time Domain Initialization
 * ========================================================== */

const times = timelineState.renderedEvents.map(d => d.time);
state.dataMin = Math.min(...times);
state.dataMax = Math.max(...times);

const dataSpan = state.dataMax - state.dataMin;

// Allow panning beyond data bounds
state.timeMin = state.dataMin - dataSpan * OUT_OF_BOUNDS_PADDING;
state.timeMax = state.dataMax + dataSpan * OUT_OF_BOUNDS_PADDING;

// Choose a valid initial view span
const span = Math.min(
    MAX_SPAN,
    Math.max(MIN_SPAN, Math.min(INITIAL_SPAN, dataSpan))
);

// Center initial view over data
const center = (state.dataMin + state.dataMax) / 2;
state.viewStart = center - span / 2;
state.viewEnd = center + span / 2;

// Clamp initial view to data bounds (not time bounds)
if (state.viewStart < state.dataMin) {
    state.viewStart = state.dataMin;
    state.viewEnd = state.viewStart + span;
}
if (state.viewEnd > state.dataMax) {
    state.viewEnd = state.dataMax;
    state.viewStart = state.viewEnd - span;
}


/* ============================================================
 * Initialization
 * ========================================================== */

// Minimap scale depends on data + time domain
initMinimap(timelineState.renderedEvents);

// Time scale depends on viewStart / viewEnd
updateTimeScale();


/* ============================================================
 * Render Loop
 * ========================================================== */

function drawAll() {
    console.log("Drawing all...");
    ctx.clearRect(0, 0, state.width, state.height);

    drawAxis(svg);          // SVG: axis + ticks
    drawLabels(ctx, timelineState.renderedEvents);  // Canvas: labels + boxes + leaders
    drawDots(ctx, timelineState.renderedEvents);    // Canvas: event dots
    drawMinimap(minimapCtx, timelineState.renderedEvents);
}

// Initial render
drawAll();


/* ============================================================
 * Interaction Wiring
 * ========================================================== */

// Mouse pan
enablePan(canvas, drawAll);

// Mouse wheel zoom
enableZoom(canvas, drawAll);

// Click on events
enableClick(canvas);

// Minimap drag / jump
enableMinimapInteraction(minimap, drawAll);

// Keyboard navigation
enableKeyboardPan(drawAll);


/* ============================================================
 * Button Bindings
 * ========================================================== */

const zoomButtons = document.querySelectorAll("#zoom-buttons button");

zoomButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const span = Number(btn.dataset.span);
        const center = (state.viewStart + state.viewEnd) / 2;

        state.viewStart = center - span / 2;
        state.viewEnd = center + span / 2;

        updateTimeScale();
        drawAll();
    });
});


