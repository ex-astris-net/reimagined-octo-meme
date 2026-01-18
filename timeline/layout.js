import { margin, outerWidth, outerHeight } from './config.js';

export function createLayout(container) {
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', outerWidth)
    .attr('height', outerHeight);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  return { svg, g, width, height };
}

export function createTimeScale(width) {
  return d3.scaleTime()
    .domain([new Date(2000, 0, 1), new Date(2025, 0, 1)])
    .range([0, width]);
}
