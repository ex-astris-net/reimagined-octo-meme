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
import { computeTimeDomain, updateTimeScale } from "./scales/time.js";

// Interaction
import { enablePan } from "./interaction/pan.js";
import { enableZoom, MIN_SPAN, MAX_SPAN } from "./interaction/zoom.js";
import { enableClick } from "./interaction/click.js";
import { enableMinimapInteraction } from "./interaction/minimap.js";
import { enableKeyboardPan } from "./interaction/keyboard.js";


/* ============================================================
 * Configuration
 * ========================================================== */

const INITIAL_SPAN = 3 * 365 * 24 * 60 * 60 * 1000;   // 3 years
const REAL_CATEGORIES = new Set([
  "Open Frequency", "Mission Briefs (Events)", "Communications", "Reports"
]);


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


function resizeCanvas() {
  const rect = container.getBoundingClientRect();

  state.width = rect.width;
  state.height = rect.height;
  state.centerY = state.height / 2;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);

  state.minimapWidth = rect.width;
  state.minimapHeight = minimap.height;
  minimap.width = state.minimapWidth;
}

const ro = new ResizeObserver(() => {
  resizeCanvas();
  updateTimeScale();
  drawAll();
});

ro.observe(container);

resizeCanvas(); // run once immediately so state is populated before anything else uses it


/* ============================================================
 * Data Load 
 * ========================================================== */

const tagToStartWith = 'sto';

const timelineState = {
    renderedEvents: [],
    filters: {
      activeTags: new Set([tagToStartWith]),
      activeCategories: new Set(["Open Frequency", "Mission Briefs (Events)", "Reports"]),
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
        timelineState.filters.mode = mode;

        dataUpdatedRedraw();
    },
    onCheckboxToggle: async (category) => {
        if (timelineState.filters.activeCategories.has(category))
          timelineState.filters.activeCategories.delete(category);
        else
          timelineState.filters.activeCategories.add(category);

        dataUpdatedRedraw();
    }
});

// primary data rendering loop
function dataUpdatedRedraw() {
    fitDataToFilters();
    computeTimeDomain(timelineState.renderedEvents);
    initMinimap(timelineState.renderedEvents);
    drawAll();
}

function fitDataToFilters() {
    console.log("Fitting data to filters...");

    const { activeCategories, activeTags, mode } = timelineState.filters;

    if (!activeTags || activeTags.size === 0) {
        timelineState.renderedEvents = [];
        return;
    }

    const activeTagList = [...activeTags];

    timelineState.renderedEvents = Object.values(eventStore).filter(event => {
        if (!matchesCategory(activeCategories, event)) return false;

        if (!event?.tags || event.tags.length === 0) return false;

        if (mode === "OR") {
            return activeTagList.some(tag => event.tags.includes(tag));
        }

        return activeTagList.every(tag => event.tags.includes(tag));
    });
}

function matchesCategory(activeCategories, event) {
  // No active filter → allow all
  if (activeCategories.size === 0) return true;

  const name = event.category?.name;
  if (!name) return false;

  const isRealCategory = REAL_CATEGORIES.has(name);

  // "Other" = not a real category
  if (!isRealCategory) {
    return activeCategories.has("Other");
  }

  // Real category
  return activeCategories.has(name);
}


/* ============================================================
 * Time Domain Initialization
 * ========================================================== */

const dataSpan = computeTimeDomain(timelineState.renderedEvents);

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


