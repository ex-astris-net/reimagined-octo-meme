import { loadTimelineData } from './data.js';
import { createScales, computeMaxZoom, computeMinZoom } from './scales.js';
import { createAxes, renderAxes } from './axes.js';
import { createZoom } from './zoom.js';
import { createScrubber } from './scrubber.js';
import { attachTooltip } from './tooltip.js';

export const URL = 'https://argo.ex-astris.net/tljson?tags=azedi';
const HIT_RADIUS = 12;
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
  const pinnedDiv = document.getElementById('pinned-event');

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
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
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
      hctx.arc(x, y, 6, 0, 2 * Math.PI);
      hctx.lineWidth = 2;
      hctx.strokeStyle = '#fff';
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
    HIT_RADIUS, // hover radius
    // Only update scrubber hovered events
    (hovered) => scrubber.setHoveredEvents(hovered)
  );

  function findEventAtPosition(mouseX, mouseY, transform) {
    const zx = transform.rescaleX(xScale);

    return events.find(d => {
      const x = zx(d.date);
      const y = yScale(d.lane);
      const dx = mouseX - x;
      const dy = mouseY - y;
      return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
    });
  }

  function renderPinnedEvent(d) {
    if (!d) {
      pinnedDiv.innerHTML = '';
      return;
    }

    pinnedDiv.innerHTML = `
      <div class="meta">
        <p class="pinned-date"><span>${d3.timeFormat("%b %d, %Y %H:%M")(d.date)}</span></p>
        <p><button class="pinned-close" aria-label="Close pinned event">×</button></p>
        <h3 class="pinned-title">${d.title ?? 'Event'}</h3>
        <p class="pinned-url"><a href="${d.url}" target="_blank">${d.url}</a></p>
      </div>
      <p class="pinned-post">${cleanupRaw(d.first_post.raw)}</p>
    `;

    // Close handler
    pinnedDiv.querySelector('.pinned-close').addEventListener('click', () => {
      pinnedDiv.innerHTML = '';
      drawHighlights(currentTransform.rescaleX(xScale), []);
    });
  }

  // Zoom
  const maxZoom = computeMaxZoom(xScale, 8); // ~20 days
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

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const clickedEvent = findEventAtPosition(
      mouseX,
      mouseY,
      currentTransform
    );

    if (clickedEvent) {
      renderPinnedEvent(clickedEvent);

      // Optional: visually pin it using your highlight layer
      const zx = currentTransform.rescaleX(xScale);
      drawHighlights(zx, [clickedEvent]);
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

function cleanupRaw(rawText, maxChars = 500) {
  if (!rawText) return "";

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n");

  // --- Decode HTML entities early (named + numeric) ---
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    // numeric entities
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );

  // --- BBCode ---
  text = text.replace(/\[event[^\]]*]/gi, "");
  text = text.replace(/\[\/event]/gi, "\n");
  text = text.replace(/\[(br|hr)\s*\/?]/gi, "\n");
  text = text.replace(/\[[^\]]+]/g, "");

  // --- HTML ---
  // Block-level tags → newline
  text = text.replace(
    /<\/?(p|div|section|article|header|footer|tr|li|ul|ol|table|thead|tbody|tfoot|h[1-6])[^>]*>/gi,
    "\n"
  );

  // Explicit line-break tags
  text = text.replace(/<(br|hr)\s*\/?>/gi, "\n");

  // Strip remaining HTML tags
  text = text.replace(/<\/?[^>]+>/g, "");

  // --- Whitespace cleanup ---
  text = text
    .split("\n")
    .map(line => line.trim())
    .join("\n");

  // Collapse excessive blank lines (max 1 blank line)
  text = text.replace(/\n\s*\n+/g, "\n\n").trim();

  // --- Escape for safe HTML output ---
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // --- Truncate preview ---
  if (text.length > maxChars) {
    text = text.slice(0, maxChars).replace(/\s+\S*$/, "") + "…";
  }

  // --- Convert newlines to <br> ---
  text = text.replace(/\n/g, "<br>");

  // Limit consecutive <br> (max 2)
  text = text.replace(/(<br>\s*){3,}/g, "<br><br>");

  return text;
}


window.onload = () => initTimeline();
