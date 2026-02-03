import { state } from "../state.js";

let xScale;

export function updateTimeScale() {
    xScale = d3.scaleTime()
        .domain([new Date(state.viewStart), new Date(state.viewEnd)])
        .range([0, state.width]);
}

export function timeToX(time) {
    return xScale(new Date(time));
}

export function xToTime(x) {
    return xScale.invert(x).getTime();
}
