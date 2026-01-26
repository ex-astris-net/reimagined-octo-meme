export function createScrubLine({
  g,
  width,
  height,
  xScale,
  layer,
  format = d3.timeFormat('%Y-%m-%d'),
  onScrub = () => {},
  onLeave = () => {}
}) {
  const line = g.append('line')
    .attr('class', 'scrub-line')
    .attr('y1', 0)
    .attr('y2', height)
    .style('pointer-events', 'none')
    .style('opacity', 0);

  const label = g.append('text')
    .attr('class', 'scrub-label')
    .attr('x', width - 6)
    .attr('y', 14)
    .attr('text-anchor', 'end')
    .style('opacity', 0);

  layer
    .on('mousemove.scrub', event => {
      const [mx] = d3.pointer(event);
      const date = xScale.invert(mx);

      line
        .attr('x1', mx)
        .attr('x2', mx)
        .style('opacity', 1);

      label
        .text(format(date))
        .style('opacity', 1);

      onScrub(date, event);
    })
    .on('mouseleave.scrub', () => {
      line.style('opacity', 0);
      label.style('opacity', 0);
      onLeave();
    });

  function updateScale(newX) {
    xScale = newX;
  }

  function hide() {
    line.style('opacity', 0);
    label.style('opacity', 0);
  }

  function show() {
    // no-op here; actual showing happens on mousemove
  }

  return {
    updateScale,
    hide,
    show
  };

}
