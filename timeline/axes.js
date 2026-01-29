import { MS_PER_DAY } from "./scales.js";

function shouldShowLabels(scale, interval, minPxPerTick) {
  const ticks = scale.ticks(interval);
  if (ticks.length < 2) return true;

  const pxPerTick =
    (scale(ticks[1]) - scale(ticks[0]));

  return pxPerTick >= minPxPerTick;
}

export function createAxes({ svg, innerHeight }) {
  const axisG = svg.append("g");

  const y = innerHeight;

  const major = axisG.append("g")
    .attr("class", "axis axis--major")
    .attr("transform", `translate(0, ${y})`);

  const minorTicks = axisG.append("g")
    .attr("class", "axis axis--minor-ticks")
    .attr("transform", `translate(0, ${y})`);

  const secondary = axisG.append("g")
    .attr("class", "axis axis--secondary")
    .attr("transform", `translate(0, ${y})`);

  return { major, minorTicks, secondary };
}

export function getAxisConfig(spanMs) {
  if (spanMs <= 60 * MS_PER_DAY) {
    return {
      top: {
        interval: d3.timeMonth.every(1),
        format: d3.timeFormat("%b")
      },
      bottom: {
        interval: d3.timeDay.every(1),
        format: d3.timeFormat("%d")
      }
    };
  }

  return {
    top: {
      interval: d3.timeYear.every(1),
      format: d3.timeFormat("%Y")
    },
    bottom: {
      interval: d3.timeMonth.every(1),
      format: d3.timeFormat("%b")
    }
  };
}

export function renderAxes({ zx, axes }) {
  const [d0, d1] = zx.domain();
  const spanMs = d1 - d0;
  const config = getAxisConfig(spanMs);

  const showPrimaryLabels = shouldShowLabels(
    zx,
    config.top.interval,
    config.top.interval === d3.timeYear.every(1) ? 60 : 40
  );

  const showSecondaryLabels = shouldShowLabels(
    zx,
    config.bottom.interval,
    config.bottom.interval === d3.timeDay.every(1) ? 0 : 40
  );

  /* ---------- MAJOR AXIS (baseline + primary labels) ---------- */

  axes.major.call(
    d3.axisBottom(zx)
      .ticks(config.top.interval)
      .tickFormat(showPrimaryLabels ? config.top.format : "")
      .tickSize(6)
      .tickSizeOuter(10)
  );

  axes.major.selectAll("text")
    .attr("dy", "1em")              // vertical offset


  /* ---------- MINOR TICKS (ONLY if secondary labels visible) ---------- */

  if (showSecondaryLabels) {
    axes.minorTicks
      .style("display", null)
      .call(
        d3.axisBottom(zx)
          .ticks(config.bottom.interval)
          .tickFormat("")
          .tickSize(9)
          .tickSizeOuter(0)
      );
  } else {
    axes.minorTicks.style("display", "none");
  }

  axes.minorTicks.select(".domain").remove();

  /* ---------- SECONDARY LABELS (labels only) ---------- */

  axes.secondary.call(
    d3.axisBottom(zx)
      .ticks(config.bottom.interval)
      .tickFormat(showSecondaryLabels ? config.bottom.format : "")
      .tickSize(0)
      .tickSizeOuter(0)
  );

  axes.secondary.select(".domain").remove();

  axes.secondary.selectAll("text")
    .attr("dy", "2.8em");
}
