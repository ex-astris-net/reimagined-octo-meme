import { state } from "../state.js";
import { timeToX } from "../scales/time.js";

export function drawDots(ctx, data) {
    ctx.save();

    const { width, centerY } = state;

    ctx.fillStyle = "#88f";

    for (const d of data) {
        const x = timeToX(d.time);

        if (x < 0 || x > width) continue;

        ctx.beginPath();
        ctx.arc(x, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}
