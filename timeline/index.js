import { URL, LANES } from './config.js';
import { loadTimelineData } from './data.js';
import { createLayout, createTimeScale } from './layout.js';
import { drawLanes } from './lanes.js';
import { drawEvents } from './events.js';
import { createAxes } from './axis.js';
import { createTooltip } from './tooltip.js';
import { createPinnedTooltip } from './pinnedTooltip.js';

const { g, width, height } = createLayout('#timeline');
const x = createTimeScale(width);

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
  .on('zoom', event => {
    const newX = event.transform.rescaleX(x);
    axes.update(newX, event.transform.k);
    g.selectAll('.event')
      .attr('cx', d => newX(d.date));
  });

zoomLayer.call(zoom);

const data = await loadTimelineData(URL);
console.log(data);
drawEvents(g, data, x, tooltip, pinnedTooltip);
axes.update(x, 1);
