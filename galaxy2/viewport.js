// viewport.js
// Attaches pan (drag) and zoom (wheel/pinch) event listeners.
// Mutates state via setZoom / setOffset, then calls the provided redraw callback.

import { DRAG_THRESHOLD_PX } from './config.js';
import { setZoom, setOffset, getViewport, getData, setHoveredId, getHoveredId } from './state.js';
import { galaxyToScreen } from './coords.js';

// ── Zoom limits ───────────────────────────────────────────────────────────────
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 12;
const ZOOM_SPEED = 0.0012; // per wheel delta-pixel

// ── Hit-test: find topmost system within a pixel radius of a screen point ─────
const HIT_RADIUS_PX = 16;

function systemAtScreen(sx, sy, viewport) {
  const { systems } = getData();
  const { zoom, offsetX, offsetY } = viewport;
  // Iterate in reverse so markers drawn last (on top) win ties
  for (let i = systems.length - 1; i >= 0; i--) {
    const sys = systems[i];
    const { sx: mx, sy: my } = galaxyToScreen(sys.gx, sys.gy, zoom, offsetX, offsetY);
    if (Math.hypot(sx - mx, sy - my) <= HIT_RADIUS_PX) return sys;
  }
  return null;
}

// ── Clamp helper ──────────────────────────────────────────────────────────────
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attach all viewport interaction listeners.
 *
 * @param {HTMLElement} container   - element that receives pointer events
 * @param {() => void}  onRedraw    - called whenever the viewport changes
 * @param {(id: string|null) => void} onSystemClick - called with system id (or null)
 */
export function initViewport(container, onRedraw, onSystemClick) {

  // ── Mouse pan + click ───────────────────────────────────────────────────────
  let dragging   = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragMoved  = false;   // true once we exceed the drag threshold

  container.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging   = true;
    dragMoved  = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  });

  window.addEventListener('mousemove', e => {
    if (!dragging) {
      // Hover hit-test
      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = systemAtScreen(sx, sy, getViewport());
      const newId = hit ? hit.id : null;
      if (newId !== getHoveredId()) {
        setHoveredId(newId);
        onRedraw();
      }
      return;
    }

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!dragMoved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      dragMoved = true;
    }

    if (dragMoved) {
      const { offsetX, offsetY } = getViewport();
      setOffset(offsetX + e.movementX, offsetY + e.movementY);
      onRedraw();
    }
  });

  window.addEventListener('mouseup', e => {
    if (!dragging || e.button !== 0) return;
    dragging = false;

    if (!dragMoved) {
      // Treat as a click
      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const hit = systemAtScreen(sx, sy, getViewport());
      onSystemClick(hit ? hit.id : null);
    }
  });

  // Cancel drag if mouse leaves window entirely
  window.addEventListener('mouseleave', () => { dragging = false; });

  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  container.addEventListener('wheel', e => {
    e.preventDefault();

    const { zoom, offsetX, offsetY } = getViewport();
    const rect = container.getBoundingClientRect();

    // Cursor position in screen space
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Compute new zoom, clamped
    const delta   = e.deltaY * ZOOM_SPEED;
    const newZoom = clamp(zoom * (1 - delta), ZOOM_MIN, ZOOM_MAX);
    const scale   = newZoom / zoom;

    // Adjust offset so the point under the cursor stays fixed
    const newOffsetX = cx - scale * (cx - offsetX);
    const newOffsetY = cy - scale * (cy - offsetY);

    setZoom(newZoom);
    setOffset(newOffsetX, newOffsetY);
    onRedraw();
  }, { passive: false });

  // ── Touch: drag + pinch-zoom ────────────────────────────────────────────────
  let lastTouches    = [];
  let touchDragMoved = false;
  let touchStartX    = 0;
  let touchStartY    = 0;

  function touchMidpoint(t1, t2) {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  }
  function touchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  container.addEventListener('touchstart', e => {
    e.preventDefault();
    lastTouches    = Array.from(e.touches);
    touchDragMoved = false;
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: false });

  container.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = Array.from(e.touches);

    if (touches.length === 1 && lastTouches.length === 1) {
      // Single-finger pan
      const dx = touches[0].clientX - lastTouches[0].clientX;
      const dy = touches[0].clientY - lastTouches[0].clientY;
      if (Math.hypot(touches[0].clientX - touchStartX, touches[0].clientY - touchStartY) >= DRAG_THRESHOLD_PX) {
        touchDragMoved = true;
      }
      if (touchDragMoved) {
        const { offsetX, offsetY } = getViewport();
        setOffset(offsetX + dx, offsetY + dy);
        onRedraw();
      }

    } else if (touches.length === 2 && lastTouches.length === 2) {
      // Two-finger pinch-zoom
      const prevDist = touchDist(lastTouches[0], lastTouches[1]);
      const currDist = touchDist(touches[0], touches[1]);
      if (prevDist === 0) { lastTouches = touches; return; }

      const { zoom, offsetX, offsetY } = getViewport();
      const rect = container.getBoundingClientRect();
      const mid  = touchMidpoint(touches[0], touches[1]);
      const cx   = mid.x - rect.left;
      const cy   = mid.y - rect.top;

      const newZoom = clamp(zoom * (currDist / prevDist), ZOOM_MIN, ZOOM_MAX);
      const scale   = newZoom / zoom;

      setZoom(newZoom);
      setOffset(cx - scale * (cx - offsetX), cy - scale * (cy - offsetY));
      onRedraw();
      touchDragMoved = true;
    }

    lastTouches = touches;
  }, { passive: false });

  container.addEventListener('touchend', e => {
    e.preventDefault();
    if (!touchDragMoved && lastTouches.length === 1) {
      // Tap — treat as click
      const rect = container.getBoundingClientRect();
      const sx = lastTouches[0].clientX - rect.left;
      const sy = lastTouches[0].clientY - rect.top;
      const hit = systemAtScreen(sx, sy, getViewport());
      onSystemClick(hit ? hit.id : null);
    }
    lastTouches = Array.from(e.touches);
  }, { passive: false });
}