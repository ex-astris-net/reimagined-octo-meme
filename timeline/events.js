import { laneIndex, laneStep, laneHeight, laneColors } from './config.js';

export function drawEvents(g, data, x, tooltip, pinnedTooltip) {
  g.selectAll('.event')
    .data(data)
    .join('circle')
    .attr('class', 'event')
    .attr('cx', d => x(d.date))
    .attr('cy', d =>
      (laneIndex.get(d.lane) ?? laneIndex.get('Other')) * laneStep +
      laneHeight / 2
    )
    .attr('r', 5)
    .attr('fill', d => laneColors[d.lane] || laneColors.Other)
    .on('mouseenter', (event, d) => tooltip.show(d, event))
    .on('mouseleave', tooltip.hide)
    .on('click', (event, d) => {
      event.stopPropagation();   
      pinnedTooltip.show(d);
    });
}
