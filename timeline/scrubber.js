// scrubber.js
export function createScrubber({
  svg,
  canvas,
  xScale,
  events,
  height,
  summaryDiv,
  drawHighlights, // overlay canvas drawing function
  yScale,
  format = d3.timeFormat("%b %d, %Y %H:%M")
}) {
  // Scrubber line
  const line = svg.append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#ff0000")
    .attr("stroke-width", 1)
    .attr("pointer-events", "none")
    .style("opacity", 0);

  // Scrubber text (top-right)
  const text = svg.append("text")
    .attr("x", svg.attr("width") - 10)
    .attr("y", 20)
    .attr("text-anchor", "end")
    .attr("fill", "#000")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .text("");

  let currentTransform = d3.zoomIdentity;
  let hidden = false;
  let hoveredEvents = [];       // tooltip hover events
  let currentScrubbed = [];     // currently highlighted by scrubber

  const HOVER_RADIUS_PX = 6;    // pixel radius for scrub highlights

  function updateTransform(transform) { currentTransform = transform; }
  function show() { if (!hidden) line.style("opacity", 1); }
  function hide() { hidden = true; line.style("opacity", 0); currentScrubbed = []; drawHighlights(currentTransform.rescaleX(xScale), []); summaryDiv.innerHTML = ''; }
  function unhide() { hidden = false; }
  function setHoveredEvents(eventsArray) { hoveredEvents = eventsArray; }

  // Scrubber mousemove
  function renderScrubber(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const zx = currentTransform.rescaleX(xScale);
    const date = zx.invert(mouseX);

    // Move scrubber line
    if (!hidden) line.attr("x1", mouseX).attr("x2", mouseX).style("opacity", 1);
    text.text(format(date));

    // Find events near scrubber (pixel distance)
    currentScrubbed = events.filter(d => Math.abs(zx(d.date) - mouseX) <= HOVER_RADIUS_PX);

    // Merge hover + scrub highlights and draw
    drawHighlights(zx, [...hoveredEvents, ...currentScrubbed]);

    // Update summary (scrubber-only)
    if (summaryDiv) {
      if (currentScrubbed.length > 0) {
        const html = currentScrubbed.map(d =>
          `<strong>${d.title}</strong> (${format(d.date)})<br>Lane: ${d.lane}`
        ).join('<br><hr style="margin:2px 0">');
        summaryDiv.innerHTML = html;
      } else {
        summaryDiv.innerHTML = '';
      }
    }
  }

  canvas.addEventListener("mousemove", renderScrubber);

  canvas.addEventListener("mouseleave", () => {
    line.style.opacity = 0;
    text.text('');
    currentScrubbed = [];
    drawHighlights(currentTransform.rescaleX(xScale), []); // clear overlay
    summaryDiv.innerHTML = '';
  });

  return { updateTransform, hide, unhide, show, setHoveredEvents };
}
