import { state } from "../state.js";
import { minimapXToTime, minimapTimeToX, minimapPixelsToTime } from "../draw/minimap.js";
import { updateTimeScale } from "../scales/time.js";

export function enableMinimapInteraction(canvas, onChange) {
    let dragging = false;
    let dragStartX = 0;
    let dragStartViewStart = 0;

    canvas.addEventListener("mousedown", (e) => {
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const mx = (e.clientX - rect.left) * scaleX;

        // check if click is inside viewport rect
        const x1 = minimapTimeToX(state.viewStart);
        const x2 = minimapTimeToX(state.viewEnd);

        const span = state.viewEnd - state.viewStart;

        if (mx >= x1 && mx <= x2) {
            // drag viewport
            dragging = true;
            dragStartX = mx;
            dragStartViewStart = state.viewStart;
        } else {
            // click-to-jump
            let centerTime = minimapXToTime(mx);
            let newStart = centerTime - span / 2;
            let newEnd = newStart + span;

            // clamp
            if (newStart < state.timeMin) {
                newStart = state.timeMin;
                newEnd = newStart + span;
            }
            if (newEnd > state.timeMax) {
                newEnd = state.timeMax;
                newStart = newEnd - span;
            }

            state.viewStart = newStart;
            state.viewEnd = newEnd;

            updateTimeScale();
            onChange();
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;

        const mx = (e.clientX - rect.left) * scaleX;
        const dx = mx - dragStartX;

        const dt = minimapPixelsToTime(dx);
        const span = state.viewEnd - state.viewStart;

        let newStart = dragStartViewStart + dt;
        let newEnd = newStart + span;

        // clamp
        if (newStart < state.timeMin) {
            newStart = state.timeMin;
            newEnd = newStart + span;
        }
        if (newEnd > state.timeMax) {
            newEnd = state.timeMax;
            newStart = newEnd - span;
        }

        state.viewStart = newStart;
        state.viewEnd = newEnd;

        updateTimeScale();
        onChange();
    });

    window.addEventListener("mouseup", () => {
        dragging = false;
    });
}
