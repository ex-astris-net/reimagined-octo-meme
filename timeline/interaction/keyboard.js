import { state } from "../state.js";
import { updateTimeScale } from "../scales/time.js";

export function enableKeyboardPan(onChange) {
    window.addEventListener("keydown", (e) => {
        // ignore if typing in inputs
        if (
            e.target.tagName === "INPUT" ||
            e.target.tagName === "TEXTAREA" ||
            e.target.isContentEditable
        ) {
            return;
        }

        const span = state.viewEnd - state.viewStart;
        const speed = e.shiftKey ? 0.10 : 0.01;
        const step = span * speed;

        let moved = false;

        if (e.key === "ArrowLeft") {
            state.viewStart -= step;
            state.viewEnd -= step;
            moved = true;
        } else if (e.key === "ArrowRight") {
            state.viewStart += step;
            state.viewEnd += step;
            moved = true;
        }

        if (!moved) return;

        // optional soft bounds
        if (state.timeMin !== undefined && state.timeMax !== undefined) {
            if (state.viewStart < state.timeMin) {
                state.viewStart = state.timeMin;
                state.viewEnd = state.viewStart + span;
            }
            if (state.viewEnd > state.timeMax) {
                state.viewEnd = state.timeMax;
                state.viewStart = state.viewEnd - span;
            }
        }

        updateTimeScale();
        onChange();
    });
}
