import { state } from "../state.js";
import { updateTimeScale } from "../scales/time.js";

export function enablePan(canvas, onPan) {
  let isPanning = false;
  let panStartX = 0;
  let panStartViewStart = 0;
  let panStartViewEnd = 0;
  let timePerPixel = 0;

  canvas.addEventListener("mousedown", (e) => {
    isPanning = true;
    panStartX = e.clientX;
    panStartViewStart = state.viewStart;
    panStartViewEnd = state.viewEnd;

    // Compute time per pixel *at the start of drag*
    timePerPixel = (panStartViewEnd - panStartViewStart) / state.width;
  });

  window.addEventListener("mouseup", () => {
    isPanning = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning) return;

    const dx = e.clientX - panStartX;

    // Simply shift the window by pixels * time per pixel
    const dt = -dx * timePerPixel;

    const span = panStartViewEnd - panStartViewStart;
    state.viewStart = panStartViewStart + dt;
    state.viewEnd = state.viewStart + span;

    updateTimeScale(); // scale is updated for drawing
    onPan();           // redraw
  }, { passive: false });
}
