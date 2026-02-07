import { state } from "../state.js";

let xScale;

export function computeTimeDomain(data, paddingRatio = 0.25) {
    if (!data || data.length === 0) return;

    const times = data.map(d => d.time);

    state.dataMin = Math.min(...times);
    state.dataMax = Math.max(...times);

    const dataSpan = state.dataMax - state.dataMin;

    state.timeMin = state.dataMin - dataSpan * paddingRatio;
    state.timeMax = state.dataMax + dataSpan * paddingRatio;

    return dataSpan;
}

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
