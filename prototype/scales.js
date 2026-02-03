export const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

export function createScales({ data, width, height, margin }) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, 1])
    .range([innerHeight, 0]);

  return {
    xScale,
    yScale,
    innerWidth,
    innerHeight
  };
}

export function computeMinZoom(xScale, visibleYears = 6) {
  const [min, max] = xScale.domain();
  const totalMs = max - min;
  const maxVisibleMs = visibleYears * MS_PER_YEAR;

  return totalMs / maxVisibleMs;
}

export function computeMaxZoom(xScale, visibleDays = 20) {
  const [min, max] = xScale.domain();
  const totalMs = max - min;
  return totalMs / (visibleDays * MS_PER_DAY);
}
