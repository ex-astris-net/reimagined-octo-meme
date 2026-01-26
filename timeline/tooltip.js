export function createTooltip() {
  const el = d3.select('body')
    .append('div')
    .attr('class', 'timeline-tooltip')
    .style('position', 'absolute')
    .style('pointer-events', 'auto') // allow links later
    .style('opacity', 0);

  function position(event) {
    el.style('left', `${event.pageX + 12}px`)
      .style('top', `${event.pageY + 12}px`);
  }

  return {
    // existing single-event tooltip (unchanged behavior)
    show(d, event) {
      el
        .style('opacity', 1)
        .html(`
          <strong>${d.title}</strong><br/>
          ${d.date.toDateString()}<br/>
          ${d.tags}
        `);

      position(event);
    },

    // 🔹 NEW: grouped tooltip for scrub
    showGroup(events, event) {
      if (!events.length) return;

      const date = events[0].date;

      const html = `
        <div class="tooltip-date">
          ${d3.timeFormat('%b %d, %Y')(date)}
        </div>
        <ul class="tooltip-list">
          ${events.map(d => `
            <li class="tooltip-item">
              <strong>${d.title}</strong><br/>
              <span class="tooltip-meta">${d.tags}</span>
            </li>
          `).join('')}
        </ul>
      `;

      el
        .style('opacity', 1)
        .html(html);

      position(event);
    },

    hide() {
      el.style('opacity', 0);
    }
  };
}
