import { state } from "../state.js";
import { updateTimeScale } from "../scales/time.js";

const DAY = 24 * 60 * 60 * 1000;

export function drawAxis(svg) {
    svg.innerHTML = "";

    const span = state.viewEnd - state.viewStart;
    const { interval, format } = getTickConfig(span);

    const scale = d3.scaleTime()
        .domain([new Date(state.viewStart), new Date(state.viewEnd)])
        .range([0, state.width]);

    const axis = d3.axisBottom(scale)
        .ticks(interval)
        .tickFormat(format)
        .tickSize(-state.height)
        .tickPadding(8);

    const axisGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );

    axisGroup.setAttribute(
        "transform",
        `translate(0, ${state.height - 20})`
    );

    d3.select(axisGroup).call(axis);

    d3.select(axisGroup)
        .selectAll(".tick line")
        .attr("stroke", "rgba(255,255,255,0.15)");

    d3.select(axisGroup)
        .select(".domain")
        .remove();

    svg.appendChild(axisGroup);

    drawCenterLine(svg);
}

function drawCenterLine(svg) {
    const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
    );

    line.setAttribute("x1", 0);
    line.setAttribute("x2", state.width);
    line.setAttribute("y1", state.centerY);
    line.setAttribute("y2", state.centerY);

    line.setAttribute("stroke", "rgba(255,255,255,0.4)");
    line.setAttribute("stroke-width", 1);

    svg.appendChild(line);
}

function getTickConfig(span) {
    if (span <= 30 * DAY) {
        return {
            interval: d3.timeDay.every(1),
            format: d3.timeFormat("%a %d") // Fri 27
        };
    }
    if (span <= 365 * DAY) {
        return {
            interval: d3.timeMonth.every(1),
            format: d3.timeFormat("%b %Y") // Jun 2024
        };
    }
    return {
        interval: d3.timeYear.every(1),
        format: d3.timeFormat("%Y") // 2024
    };
}
