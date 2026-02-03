import { state } from "../state.js";

export function enableClick(canvas) {
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const hit = findLabelHit(mx, my);

        if (hit) {
            pinEvent(hit.datum);
        }
    });
}

function findLabelHit(x, y) {
    // iterate backwards so top-most wins
    for (let i = state.labelRects.length - 1; i >= 0; i--) {
        const { rect, datum } = state.labelRects[i];

        if (
            x >= rect.x &&
            x <= rect.x + rect.w &&
            y >= rect.y &&
            y <= rect.y + rect.h
        ) {
            return { rect, datum };
        }
    }
    return null;
}

function pinEvent(d) {
    const pinned = document.getElementById("pinned");

    pinned.innerHTML = `
        <div class="pinned-meta">
            <p class="pinned-date"><span>${formatDate(d.time)}</span></p>
            <button class="pin-close" aria-label="Close">×</button>
        </div>

        <div class="pinned-header">
            <h3>${d.title}</h3>
            <p class="pinned-url"><a href="${d.url}">${d.url}</a></p>
        </div>

        ${d.tags?.length
            ? `<div class="pinned-tags">${d.tags.join(", ")}</div>`
            : ""
        }

        <div class="pinned-post">
            ${excerpt(cleanupPost(d.first_post.raw))}
        </div>
    `;

    pinned.classList.add("visible");

    pinned
        .querySelector(".pin-close")
        .addEventListener("click", () => {
            clearPinned();
        });
}

function clearPinned() {
    const pinned = document.getElementById("pinned");
    pinned.innerHTML = "";
    pinned.classList.remove("visible");
}

function cleanupPost(raw) {
    if (!raw) return "";

    let text = raw;

    // 1. Remove HTML tags
    text = text.replace(/<\/?[^>]+>/gi, "");

    // 2. Remove BBCode tags (e.g. [spoiler], [url=...], [/b])
    text = text.replace(/\[\/?[a-z0-9]+(?:=[^\]]+)?\]/gi, "");

    // Optional: clean up common HTML entities
    text = text
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, `"`)
        .replace(/&apos;/gi, `'`)
        .replace(/&amp;/gi, "&");

    // 3. Normalize newlines, then convert to <br>
    text = text
        .replace(/\r\n|\r/g, "\n")   // normalize
        .replace(/\n+/g, "<br>");    // convert

    // Optional: trim leftover whitespace
    return text.trim();
}

function excerpt(content) {
    const n = 567;

    if (typeof content !== "string") return "";
    if (typeof n !== "number" || n < 0) return "";

    return content.length > n
        ? content.substring(0, n) + "..."
        : content;
}

function formatDate(ts) {
    const d = new Date(ts);

    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}