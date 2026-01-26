import { URL, LANES, SNAP_PX } from './config.js';
import { loadTimelineData } from './data.js';
import { createLayout, createTimeScale } from './layout.js';
import { drawLanes } from './lanes.js';
import { drawEvents } from './events.js';
import { createAxes } from './axis.js';
import { createTooltip } from './tooltip.js';
import { createPinnedTooltip } from './pinnedTooltip.js';
import { createScrubLine } from './scrubLine.js';

const { g, width, height } = createLayout('#timeline');
const x = createTimeScale(width);

const data = await loadTimelineData(URL);
console.log(data);

let dateBins = [];
let lastDate = null;

drawLanes(g, LANES, width);

const tooltip = createTooltip();
const pinnedTooltip = createPinnedTooltip('#timeline-detail');
const axes = createAxes(g, x, height);

const zoomLayer = g.append('rect')
  .attr('width', width)
  .attr('height', height)
  .style('fill', 'none')
  .style('pointer-events', 'all');

const zoom = d3.zoom()
  .scaleExtent([0.5, 180])
  .on('start', () => {
    scrubLine.hide();
    tooltip.hide();
  })
  .on('zoom', event => {
    const newX = event.transform.rescaleX(x);

    axes.update(newX, event.transform.k);

    g.selectAll('.event')
      .attr('cx', d => newX(d.date));

    scrubLine.updateScale(newX);
    rebuildDateBins(newX, data);
  })
  .on('end', () => {
    lastDate = null; // prevent stale snap
  });

const scrubLine = createScrubLine({
  g,
  width,
  height,
  xScale: x,
  layer: zoomLayer,
  format: d3.timeFormat('%b %d, %Y'),

  onScrub: (date, event) => {
    const [mx] = d3.pointer(event);
    const bin = findNearestBin(mx);

    if (!bin) {
      tooltip.hide();
      g.selectAll('.event').classed('hovered', false);
      lastDate = null;
      return;
    }

    if (lastDate && +lastDate === +bin.date) return;

    lastDate = bin.date;

    // highlight all events on this date
    g.selectAll('.event').classed('hovered', false);

    bin.events.forEach(d => {
      g.selectAll('.event')
        .filter(e => e === d)
        .classed('hovered', true)
        .raise();
    });

    // 🔹 single grouped tooltip
    tooltip.showGroup(bin.events, event);
  },

  onLeave: () => {
    g.selectAll('.event').classed('hovered', false);
    tooltip.hide();
  }
});

zoomLayer.call(zoom);
rebuildDateBins(x, data);

drawEvents(g, data, x, tooltip, pinnedTooltip);
axes.update(x, 1);

function rebuildDateBins(scale, data) {
  dateBins = d3.groups(data, d => +d.date)
    .map(([key, events]) => {
      const date = new Date(+key);
      return {
        date,
        events,
        x: scale(date)
      };
    })
    .sort((a, b) => a.x - b.x);
}

function findNearestBin(mx) {
  let best = null;
  let bestDist = Infinity;

  for (const bin of dateBins) {
    const dist = Math.abs(bin.x - mx);
    if (dist < bestDist) {
      best = bin;
      bestDist = dist;
    }
  }

  return bestDist <= SNAP_PX ? best : null;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
