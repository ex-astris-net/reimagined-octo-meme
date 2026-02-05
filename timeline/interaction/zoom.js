import { state } from "../state.js";
import { xToTime, updateTimeScale } from "../scales/time.js";

export const MIN_SPAN = 10 * 24 * 60 * 60 * 1000;     // 1 day
export const MAX_SPAN = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years

export function enableZoom(canvas, onZoom) {
    canvas.addEventListener("wheel", (e) => {
        e.preventDefault();

        const mx = e.offsetX;
        const timeUnderMouse = xToTime(mx);

        const span = state.viewEnd - state.viewStart;
        const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;

        let newSpan = span * zoomFactor;
        newSpan = Math.min(MAX_SPAN, Math.max(MIN_SPAN, newSpan));

        const ratio = (timeUnderMouse - state.viewStart) / span;

        state.viewStart = timeUnderMouse - ratio * newSpan;
        state.viewEnd = state.viewStart + newSpan;

        updateTimeScale();
        onZoom();
    }, { passive: false });
}
