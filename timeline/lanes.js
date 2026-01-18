import { laneHeight, laneStep } from './config.js';

export function drawLanes(g, lanes, width) {
  const group = g.append('g').attr('class', 'lanes');

  group.selectAll('.lane')
    .data(lanes)
    .join('rect')
    .attr('class', 'lane')
    .attr('x', 0)
    .attr('y', (_, i) => i * laneStep)
    .attr('width', width)
    .attr('height', laneHeight)
    .attr('fill', (_, i) => i % 2 ? '#fafafa' : '#f0f0f0');
}
