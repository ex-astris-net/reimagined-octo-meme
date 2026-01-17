const url = "https://argo.ex-astris.net/tljson";
let timelineData = {};

d3.json(url)
  .then(data => {
    const topics = data.topics;

    timelineData = topics.map(item => {
      const d = new Date(item.first_post.created_at);

      return {
        ...item,
        date: new Date(
          d.getFullYear(),
          d.getMonth(), // 0-based
          d.getDate()
        )
      };
    });

    console.log("Timeline data:", timelineData);
    drawTimeline(timelineData);
  });

function drawTimeline(timelineData) {

  g.selectAll('.event')
    .data(timelineData)
    .join('circle')
    .attr('class', 'event')
    .attr('cx', d => x(d.date))
    .attr('cy', height / 2)
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.title}</strong><br/>
          ${d.date.toDateString()}<br/>
          ${d.url}
        `);
    })
    .on('mousemove', event => {
      tooltip
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY + 10}px`);
    })
    .on('mouseleave', () => {
      tooltip.style('opacity', 0);
    });
}


const tooltip = d3.select('body')
  .append('div')
  .attr('class', 'timeline-tooltip')
  .style('position', 'absolute')
  .style('pointer-events', 'none')
  .style('background', 'rgba(0,0,0,0.8)')
  .style('color', '#fff')
  .style('padding', '6px 8px')
  .style('border-radius', '4px')
  .style('font-size', '12px')
  .style('opacity', 0);


const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const width = 800 - margin.left - margin.right;
const height = 120 - margin.top - margin.bottom;

const svg = d3.select('#timeline')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`); 

const x = d3.scaleTime()
    .domain([
    new Date(2000, 0, 1),
    new Date(2025, 0, 1)
    ])
    .range([0, width]);

const xAxis = d3.axisBottom(x);

const xAxisGroup = g.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0, ${height})`)
  .call(xAxis);

const zoomLayer = g.append('rect')
  .attr('width', width)
  .attr('height', height)
  .style('fill', 'none')
  .style('pointer-events', 'all');

const zoom = d3.zoom()
  .scaleExtent([0.5, 180])
  .translateExtent([[0, 0], [width, height]])
  .on('zoom', zoomed);

zoomLayer.call(zoom);

function zoomed(event) {
  const newX = event.transform.rescaleX(x);

  xAxisGroup.call(d3.axisBottom(newX));

  g.selectAll('.event')
    .attr('cx', d => newX(d.date));
}
