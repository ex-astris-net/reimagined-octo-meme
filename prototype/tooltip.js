/**
 * Creates a tooltip DOM element
 */
export function createTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  tooltip.style.cssText = `
    position: absolute;
    pointer-events: none;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 5px 8px;
    border-radius: 4px;
    font-size: 12px;
    display: none;
    z-index: 10;
  `;
  document.body.appendChild(tooltip);

  return {
    show: (html, x, y) => {
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = `${x + 10}px`;
      tooltip.style.top = `${y + 10}px`;
    },
    hide: () => {
      tooltip.style.display = 'none';
    }
  };
}

export function attachTooltip(canvas, events, xAccessor, yAccessor, radius = 5, highlightCallback) {
  const tooltip = createTooltip();
  let quadtree = null;
  let transformedEvents = [];
  let currentTransform = d3.zoomIdentity;

  let latestEvent = null;
  let pendingRender = false;

  function updateTransform(transform) {
    currentTransform = transform;
    transformedEvents = events.map(d => ({
      original: d,
      x: xAccessor(d, transform),
      y: yAccessor(d)
    }));
    quadtree = d3.quadtree()
      .x(d => d.x)
      .y(d => d.y)
      .addAll(transformedEvents);
  }

  function renderTooltip() {
    if (!latestEvent || !quadtree) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = latestEvent.clientX - rect.left;
    const mouseY = latestEvent.clientY - rect.top;

    let found = null;

    quadtree.visit((node, x0, y0, x1, y1) => {
      if (!node.data) return x0 > mouseX + radius || x1 < mouseX - radius || y0 > mouseY + radius || y1 < mouseY - radius;
      const d = node.data;
      const dx = mouseX - d.x;
      const dy = mouseY - d.y;
      if (dx * dx + dy * dy <= radius * radius) {
        found = d.original;
        return true;
      }
      return false;
    });

    if (found) {
      tooltip.show(
        `<strong>${found.title}</strong><br>
        ${d3.timeFormat("%b %d, %Y %H:%M")(found.date)}<br>
        Lane: ${found.lane}`,
        latestEvent.clientX,
        latestEvent.clientY
      );

      // Call highlight callback with array of one event
      highlightCallback && highlightCallback([found]);
    } else {
      tooltip.hide();
      highlightCallback && highlightCallback([]);
    }

    pendingRender = false;
  }

  canvas.addEventListener('mousemove', e => {
    latestEvent = e;
    if (!pendingRender) {
      pendingRender = true;
      requestAnimationFrame(renderTooltip);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.hide();
    latestEvent = null;
    pendingRender = false;
    highlightCallback && highlightCallback([]);
  });

  // ✅ add a hide() method
  function hide() {
    tooltip.hide();
    highlightCallback && highlightCallback([]);
  }

  return { updateTransform, hide }; // <-- now tooltipController.hide() works
}


