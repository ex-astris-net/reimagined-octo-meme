export function createAxes(g, x, height) {
  const major = g.append('g')
    .attr('class', 'x-axis-major')
    .attr('transform', `translate(0, ${height})`);

  const minor = g.append('g')
    .attr('class', 'x-axis-minor')
    .attr('transform', `translate(0, ${height})`);

  function update(newX, k) {
    let majorAxis, minorAxis;

    if (k < 5) {
      majorAxis = d3.axisBottom(newX)
        .ticks(d3.timeYear.every(1))
        .tickSize(-height)
        .tickFormat(d3.timeFormat('%Y'));

      minorAxis = d3.axisBottom(newX)
        .ticks(d3.timeMonth.every(3))
        .tickSize(6)
        .tickFormat('');
    } else if (k < 20) {
      majorAxis = d3.axisBottom(newX)
        .ticks(d3.timeYear.every(1))
        .tickFormat(d3.timeFormat('%Y'));

      minorAxis = d3.axisBottom(newX)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat('%b'));
    } else {
      majorAxis = d3.axisBottom(newX)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat('%b'));

      minorAxis = d3.axisBottom(newX)
        .ticks(d3.timeWeek.every(1))
        .tickFormat('');
    }

    major.call(majorAxis);
    minor.call(minorAxis);
  }

  return { update };
}
