export function createTooltip() {
  const el = d3.select('body')
    .append('div')
    .attr('class', 'timeline-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('opacity', 0);

  return {
    show(d, event) {
      el.style('opacity', 1)
        .html(`
          <strong>${d.title}</strong><br/>
          ${d.date.toDateString()}<br/>
          ${d.tags}
        `)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`);
    },
    hide() {
      el.style('opacity', 0);
    }
  };
}
