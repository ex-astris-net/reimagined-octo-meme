import { state, categoryColors, rgba } from "../state.js";

let minimapScale = null;

export function initMinimap(data) {
    const times = data.map(d => d.time);

    minimapScale = d3.scaleTime()
        .domain([
            new Date(Math.min(...times)),
            new Date(Math.max(...times))
        ])
        .range([0, state.minimapWidth]);
}

export function drawMinimap(ctx, data) {
    if (!minimapScale) return;

    ctx.clearRect(0, 0, state.minimapWidth, state.minimapHeight);

    const yMid = state.minimapHeight / 2;
    const barHeight = state.minimapHeight * 0.4;

    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const x = Math.round(minimapScale(new Date(d.time)));

        ctx.strokeStyle = rgba(categoryColors[d.category.name], 1);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, yMid - barHeight / 2);
        ctx.lineTo(x, yMid + barHeight / 2);
        ctx.stroke();
    }

    // viewport rectangle
    const x1 = minimapScale(new Date(state.viewStart));
    const x2 = minimapScale(new Date(state.viewEnd));

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, 2, x2 - x1, state.minimapHeight - 4);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(x1, 2, x2 - x1, state.minimapHeight - 4);
}

export function minimapXToTime(x) {
    return minimapScale.invert(x).getTime();
}

export function minimapPixelsToTime(dx) {
    const domain = minimapScale.domain();
    const range = minimapScale.range();

    const timeSpan = domain[1].getTime() - domain[0].getTime();
    const pixelSpan = range[1] - range[0];

    return (dx / pixelSpan) * timeSpan;
}

export function minimapTimeToX(time) {
    return minimapScale(new Date(time));
}
