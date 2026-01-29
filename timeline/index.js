import { loadTimelineData } from './data.js';
import { createScales, computeMaxZoom, computeMinZoom } from './scales.js';
import { createAxes, renderAxes } from './axes.js';
import { createZoom } from './zoom.js';
import { createScrubber } from './scrubber.js';
import { attachTooltip } from './tooltip.js';

export const URL = 'https://argo.ex-astris.net/tljson';
let pendingDraw = false;  // throttle canvas redraws

async function initTimeline() {
  const container = document.getElementById('timeline-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };

  let currentTransform = d3.zoomIdentity;

  // Main canvas
  const canvas = document.getElementById('event-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;

  // Highlight overlay canvas
  const highlightCanvas = document.getElementById('highlight-canvas');
  const hctx = highlightCanvas.getContext('2d');
  highlightCanvas.width = width;
  highlightCanvas.height = height;

  // SVG overlay for axes/scrubber
  const svg = d3.select('#overlay')
    .attr('width', width)
    .attr('height', height);

  const summaryDiv = document.getElementById('scrubber-summary');

  // Load data
  const { events, domain } = await loadTimelineData(URL);

  const laneColors = {
    "Open Frequency": "#e74c3c",          // red
    "Mission Briefs (Events)": "#27ae60", // green
    "Communications": "#3498db",          // blue
    "Reports": "#e67e22",                 // orange
    "Other": "#95a5a6"                     // gray for all other categories
  };

  // Pale versions for backgrounds (just add alpha)
  const laneBgColors = {};
  for (const lane in laneColors) {
    laneBgColors[lane] = laneColors[lane] + "22"; // 22 hex ≈ 13% opacity
  }

  // Ensure all lanes in your data are included
  const lanes = Object.keys(laneColors).filter(lane => events.some(d => d.lane === lane));

  const yScale = d3.scalePoint()
    .domain(lanes)
    .range([margin.top, height - margin.bottom])
    .padding(0.5);

  // Time xScale
  const { xScale, innerWidth, innerHeight } = createScales({
    data: events,
    width,
    height,
    margin,
    domain
  });

  // Draw main events
  function drawEvents(zx) {
    ctx.clearRect(0, 0, width, height);

    events.forEach(d => {
      const x = zx(d.date);
      const y = yScale(d.lane);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = laneColors[d.lane] || laneColors["Other"]; // fallback to gray
      ctx.fill();
    });
  }

  // Draw highlighted events on overlay
  function drawHighlights(zx, highlightedEvents) {
    hctx.clearRect(0, 0, highlightCanvas.width, highlightCanvas.height);

    highlightedEvents.forEach(d => {
      const x = zx(d.date);
      const y = yScale(d.lane);

      hctx.beginPath();
      hctx.arc(x, y, 5, 0, 2 * Math.PI);
      hctx.lineWidth = 2;
      hctx.strokeStyle = '#ff0000';
      hctx.stroke();
    });
  }

  drawEvents(xScale);

  // Axes
  const axes = createAxes({ svg, innerHeight });

  // Scrubber
  const scrubber = createScrubber({
    svg,
    canvas,
    xScale,
    height,
    events,
    summaryDiv,
    format: d3.timeFormat("%b %d, %Y %H:%M"),
    drawHighlights,
    yScale
  });

  // Tooltip with overlay highlight
  const tooltipController = attachTooltip(
    canvas,
    events,
    (d, transform) => transform.rescaleX(xScale)(d.date), 
    d => yScale(d.lane), 
    5, // hover radius
    // Only update scrubber hovered events
    (hovered) => scrubber.setHoveredEvents(hovered)
  );

  // Zoom
  const maxZoom = computeMaxZoom(xScale, 20); // ~20 days
  const minZoom = computeMinZoom(xScale, 10); // 10 years

  const { zoom, selection } = createZoom({
    canvas,
    minZoom,
    maxZoom,
    innerWidth,
    innerHeight,
    onZoom: (event) => {
      currentTransform = event.transform;

      // Only schedule one redraw per animation frame
      if (!pendingDraw) {
        pendingDraw = true;
        requestAnimationFrame(() => {
          const zx = currentTransform.rescaleX(xScale);

          drawEvents(zx);
          drawHighlights(zx, []); // clear highlights during zoom
          renderAxes({ zx, axes });
          scrubber.updateTransform(currentTransform);
          tooltipController.updateTransform(currentTransform);

          pendingDraw = false; // ready for next frame
        });
      }
    }
  });

  // Initial transform: 6 years visible, aligned right
  const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
  const visibleMs = 6 * MS_PER_YEAR;
  const totalMs = domain[1] - domain[0];
  const k = totalMs / visibleMs;
  const tx = -innerWidth * (k - 1);
  selection.call(zoom.transform, d3.zoomIdentity.translate(tx, 0).scale(k));

  // Hide scrubber & tooltip while dragging
  zoom.on("start", () => {
    scrubber.hide();
    tooltipController.hide();
  });
  zoom.on("end", () => {
    scrubber.unhide();
    tooltipController.updateTransform(currentTransform);
  });
}

window.onload = () => initTimeline();
